/**
 * Quota management page - coordinates the three quota sections.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useHorizontalWheelScroll } from '@/hooks/useHorizontalWheelScroll';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuthStore, useThemeStore } from '@/stores';
import { authFilesApi, configFileApi } from '@/services/api';
import {
  QuotaSection,
  ANTIGRAVITY_CONFIG,
  CLAUDE_CONFIG,
  CODEX_CONFIG,
  GEMINI_CLI_CONFIG,
  KIMI_CONFIG,
  XAI_CONFIG,
} from '@/components/quota';
import type { AuthFileItem } from '@/types';
import styles from './QuotaPage.module.scss';

import iconClaude from '@/assets/icons/claude.svg';
import iconCodex from '@/assets/icons/codex.svg';
import iconAntigravity from '@/assets/icons/antigravity.svg';
import iconGemini from '@/assets/icons/gemini.svg';
import iconKimiLight from '@/assets/icons/kimi-light.svg';
import iconKimiDark from '@/assets/icons/kimi-dark.svg';
import iconGrokLight from '@/assets/icons/grok.svg';
import iconGrokDark from '@/assets/icons/grok-dark.svg';

type QuotaProviderId = 'claude' | 'antigravity' | 'codex' | 'gemini-cli' | 'kimi' | 'xai';

const QUOTA_TAB_STORAGE_KEY = 'quota-management.active-tab';
const QUOTA_TAB_IDS: QuotaProviderId[] = [
  'claude',
  'antigravity',
  'codex',
  'gemini-cli',
  'kimi',
  'xai',
];

export function QuotaPage() {
  const { t } = useTranslation();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  const [files, setFiles] = useState<AuthFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  useHorizontalWheelScroll(tabsContainerRef);

  const [activeTab, setActiveTab] = useState<QuotaProviderId>(() => {
    try {
      const saved = localStorage.getItem(QUOTA_TAB_STORAGE_KEY);
      if (saved && QUOTA_TAB_IDS.includes(saved as QuotaProviderId)) {
        return saved as QuotaProviderId;
      }
    } catch {
      // localStorage can be unavailable in hardened/privacy contexts.
    }
    return 'claude';
  });

  useEffect(() => {
    try {
      localStorage.setItem(QUOTA_TAB_STORAGE_KEY, activeTab);
    } catch {
      // Persistence is a convenience; tab switching should keep working without it.
    }

    const timeoutId = window.setTimeout(() => {
      const activeEl = tabsContainerRef.current?.querySelector(`[data-tab-id="${activeTab}"]`);
      activeEl?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab]);

  const disableControls = connectionStatus !== 'connected';

  const loadConfig = useCallback(async () => {
    try {
      await configFileApi.fetchConfigYaml();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('notification.refresh_failed');
      setError((prev) => prev || errorMessage);
    }
  }, [t]);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authFilesApi.list();
      setFiles(data?.files || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('notification.refresh_failed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleHeaderRefresh = useCallback(async () => {
    await Promise.all([loadConfig(), loadFiles()]);
  }, [loadConfig, loadFiles]);

  useHeaderRefresh(handleHeaderRefresh);

  useEffect(() => {
    loadFiles();
    loadConfig();
  }, [loadFiles, loadConfig]);

  const tabs = [
    { id: 'claude', config: CLAUDE_CONFIG, getIcon: () => iconClaude },
    { id: 'antigravity', config: ANTIGRAVITY_CONFIG, getIcon: () => iconAntigravity },
    { id: 'codex', config: CODEX_CONFIG, getIcon: () => iconCodex },
    { id: 'gemini-cli', config: GEMINI_CLI_CONFIG, getIcon: () => iconGemini },
    {
      id: 'kimi',
      config: KIMI_CONFIG,
      getIcon: (theme: string) => (theme === 'dark' ? iconKimiDark : iconKimiLight),
    },
    {
      id: 'xai',
      config: XAI_CONFIG,
      getIcon: (theme: string) => (theme === 'dark' ? iconGrokDark : iconGrokLight),
    },
  ] as const;

  const tabsWithCounts = tabs.map((tab) => ({
    ...tab,
    count: files.filter(tab.config.filterFn).length,
  }));
  const nonEmptyTabs = tabsWithCounts.filter((tab) => tab.count > 0);
  // While loading, or when the user truly has no auth files yet, fall back to showing
  // every tab so the page never collapses into nothing.
  const visibleTabs = loading || nonEmptyTabs.length === 0 ? tabsWithCounts : nonEmptyTabs;
  // If the user's last selection (`activeTab`) is currently hidden because its provider
  // has zero files, render the first visible tab instead. We keep `activeTab` untouched
  // so the page auto-restores when a file for that provider reappears.
  const effectiveActiveTab: QuotaProviderId = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : visibleTabs[0]?.id ?? activeTab;

  const renderActiveSection = () => {
    switch (effectiveActiveTab) {
      case 'antigravity':
        return (
          <QuotaSection
            config={ANTIGRAVITY_CONFIG}
            files={files}
            loading={loading}
            disabled={disableControls}
          />
        );
      case 'codex':
        return (
          <QuotaSection
            config={CODEX_CONFIG}
            files={files}
            loading={loading}
            disabled={disableControls}
          />
        );
      case 'gemini-cli':
        return (
          <QuotaSection
            config={GEMINI_CLI_CONFIG}
            files={files}
            loading={loading}
            disabled={disableControls}
          />
        );
      case 'kimi':
        return (
          <QuotaSection
            config={KIMI_CONFIG}
            files={files}
            loading={loading}
            disabled={disableControls}
          />
        );
      case 'xai':
        return (
          <QuotaSection
            config={XAI_CONFIG}
            files={files}
            loading={loading}
            disabled={disableControls}
          />
        );
      case 'claude':
      default:
        return (
          <QuotaSection
            config={CLAUDE_CONFIG}
            files={files}
            loading={loading}
            disabled={disableControls}
          />
        );
    }
  };

  return (
    <div className={styles.container}>
      <PageHeader title={t('quota_management.title')} description={t('quota_management.description')} />

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.mainContent}>
        <div
          className={styles.tabsContainer}
          role="tablist"
          aria-label={t('quota_management.title')}
          ref={tabsContainerRef}
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`quota-tab-${tab.id}`}
              data-tab-id={tab.id}
              aria-selected={effectiveActiveTab === tab.id}
              aria-controls={`quota-panel-${tab.id}`}
              className={`${styles.tabButton} ${effectiveActiveTab === tab.id ? styles.activeTab : ''}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <img src={tab.getIcon(resolvedTheme)} alt="" className={styles.tabIcon} />
              <span className={styles.tabLabel}>{t(`${tab.config.i18nPrefix}.title`)}</span>
              <span className={styles.tabCount}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`quota-panel-${effectiveActiveTab}`}
          aria-labelledby={`quota-tab-${effectiveActiveTab}`}
        >
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
}
