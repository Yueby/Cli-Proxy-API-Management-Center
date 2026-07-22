import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ItemCard } from '@/components/ui/ItemCard';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { ExcludedModelsList, FieldRow } from '@/components/providers/ProviderCardParts';
import {
  getOpenAIProviderRecentStatusData,
  getOpenAIProviderTotalStats,
  getProviderRecentStatusData,
  getProviderTotalStats,
  stripDisableAllModelsRule,
  type ProviderRecentUsageMap,
} from '@/components/providers/utils';
import { IconEye, IconKey, IconNetwork, IconPencil, IconTrash2 } from '@/components/ui/icons';
import type {
  ApiKeyEntry,
  GeminiKeyConfig,
  OpenAIProviderConfig,
  ProviderKeyConfig,
} from '@/types';
import type { StatusBarData } from '@/utils/recentRequests';
import { maskApiKey } from '@/utils/format';
import { useThemeStore } from '@/stores';
import type { ResolvedTheme } from '@/features/authFiles/constants';
import type { ProviderBrand, ProviderResource } from '../types';
import { PROVIDER_LOGOS } from '../brandLogos';
import { isMultiProtocolSponsorBrand } from '../sponsorDefinitions';
import keyBadgeStyles from '@/components/providers/OpenAISection/KeyCountBadge.module.scss';

interface ProviderResourceCardsProps {
  resources: ProviderResource[];
  disableMutations?: boolean;
  usageByProvider?: ProviderRecentUsageMap;
  onView: (resource: ProviderResource) => void;
  onEdit: (resource: ProviderResource) => void;
  onDelete: (resource: ProviderResource) => void;
  onToggleDisabled?: (resource: ProviderResource, disabled: boolean) => void;
  onShowModels: (resource: ProviderResource) => void;
}

const PROVIDER_FALLBACKS: Partial<Record<ProviderBrand, string>> = {
  gemini: 'G',
  codex: 'C',
  claude: 'C',
  vertex: 'V',
  openaiCompatibility: 'O',
};

const PROVIDER_LABELS: Partial<Record<ProviderBrand, string>> = {
  gemini: 'Gemini',
  codex: 'Codex',
  claude: 'Claude',
  vertex: 'Vertex',
  openaiCompatibility: 'OpenAI',
};

const getProviderIcon = (brand: ProviderBrand, resolvedTheme: ResolvedTheme): string => {
  const logo = PROVIDER_LOGOS[brand];
  return resolvedTheme === 'dark' && logo.darkSrc ? logo.darkSrc : logo.src;
};

const EMPTY_STATUS_BAR: StatusBarData = {
  blocks: [],
  blockDetails: [],
  successRate: 0,
  totalSuccess: 0,
  totalFailure: 0,
};

const providerKeyConfig = (resource: ProviderResource) => resource.raw as ProviderKeyConfig;
const geminiConfig = (resource: ProviderResource) => resource.raw as GeminiKeyConfig;
const openAIConfig = (resource: ProviderResource) => resource.raw as OpenAIProviderConfig;

const getStatusData = (
  resource: ProviderResource,
  usageByProvider?: ProviderRecentUsageMap
): StatusBarData => {
  if (!usageByProvider) return EMPTY_STATUS_BAR;
  if (resource.brand === 'openaiCompatibility') {
    return getOpenAIProviderRecentStatusData(openAIConfig(resource), usageByProvider);
  }
  return getProviderRecentStatusData(
    usageByProvider,
    resource.brand,
    resource.apiKey ?? undefined,
    resource.baseUrl ?? undefined
  );
};

const getStats = (
  resource: ProviderResource,
  usageByProvider?: ProviderRecentUsageMap
): { success: number; failure: number } => {
  if (!usageByProvider) return { success: 0, failure: 0 };
  if (resource.brand === 'openaiCompatibility') {
    return getOpenAIProviderTotalStats(openAIConfig(resource), usageByProvider);
  }
  return getProviderTotalStats(
    usageByProvider,
    resource.brand,
    resource.apiKey ?? undefined,
    resource.baseUrl ?? undefined
  );
};

interface KeyCountBadgeProps {
  entries: NonNullable<OpenAIProviderConfig['apiKeyEntries']>;
  providerName: string;
  baseUrl: string;
  usageByProvider?: ProviderRecentUsageMap;
}

function KeyCountBadge({ entries, providerName, baseUrl, usageByProvider }: KeyCountBadgeProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const openBadge = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setShow(true);
  };

  const toggleBadge = () => {
    if (!show && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setShow((v) => !v);
  };

  useEffect(() => {
    if (!show) return;
    const dismiss = () => setShow(false);
    const handlePointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('touchmove', dismiss, true);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('touchmove', dismiss, true);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [show]);

  if (!entries || entries.length === 0) return null;

  return (
    <>
      <div
        ref={ref}
        className={keyBadgeStyles.badge}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') openBadge();
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setShow(false);
        }}
        onClick={toggleBadge}
      >
        <span className={keyBadgeStyles.badgeIcon}>
          <IconKey size={13} />
        </span>
        <span className={keyBadgeStyles.badgeCount}>{entries.length}</span>
      </div>
      {show &&
        createPortal(
          <div className={keyBadgeStyles.tooltip} style={{ top: pos.top, left: pos.left }}>
            <div className={keyBadgeStyles.tooltipList}>
              {entries.map((entry, i) => {
                const entryStats = usageByProvider
                  ? getProviderTotalStats(usageByProvider, providerName, entry.apiKey, baseUrl)
                  : { success: 0, failure: 0 };
                return (
                  <div key={i} className={keyBadgeStyles.tooltipItem}>
                    <span className={keyBadgeStyles.tooltipIndex}>{i + 1}</span>
                    <span className={keyBadgeStyles.tooltipKey}>{maskApiKey(entry.apiKey)}</span>
                    <span className={keyBadgeStyles.tooltipStats}>
                      <span className={keyBadgeStyles.tooltipSuccess}>✓{entryStats.success}</span>
                      <span className={keyBadgeStyles.tooltipFailure}>✗{entryStats.failure}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export function ProviderResourceCards({
  resources,
  disableMutations,
  usageByProvider,
  onView,
  onEdit,
  onDelete,
  onToggleDisabled,
  onShowModels,
}: ProviderResourceCardsProps) {
  const { t } = useTranslation();
  const resolvedTheme: ResolvedTheme = useThemeStore((state) => state.resolvedTheme);

  const renderPriorityBadge = (priority?: number) =>
    priority !== undefined ? (
      <span
        className={ItemCard.styles.typeBadge}
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.10)',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.25)',
        }}
      >
        <IconNetwork size={12} /> P{priority}
      </span>
    ) : null;

  const renderHeaderExtra = (
    entries: ApiKeyEntry[],
    providerName: string,
    baseUrl: string,
    priority?: number
  ) => {
    if (!entries.length && priority === undefined) return undefined;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <KeyCountBadge
          entries={entries}
          providerName={providerName}
          baseUrl={baseUrl}
          usageByProvider={usageByProvider}
        />
        {renderPriorityBadge(priority)}
      </div>
    );
  };

  const renderCommonCard = (resource: ProviderResource) => {
    const raw = resource.brand === 'gemini' ? geminiConfig(resource) : providerKeyConfig(resource);
    const excludedModels = stripDisableAllModelsRule(raw.excludedModels);
    const stats = getStats(resource, usageByProvider);
    const statusData = getStatusData(resource, usageByProvider);
    const apiKeyEntries = raw.apiKey
      ? [{ apiKey: raw.apiKey, proxyUrl: raw.proxyUrl, authIndex: raw.authIndex }]
      : [];

    return (
      <ItemCard
        key={resource.id}
        disabled={resource.disabled}
        compact
        avatar={{
          icon: getProviderIcon(resource.brand, resolvedTheme),
          fallback: PROVIDER_FALLBACKS[resource.brand],
          bgColor: 'transparent',
        }}
        title={resource.identifier}
        subtitle={raw.baseUrl}
        headerExtra={renderHeaderExtra(
          apiKeyEntries,
          PROVIDER_LABELS[resource.brand] ?? resource.identifier,
          raw.baseUrl ?? '',
          raw.priority
        )}
        content={
          <>
            <FieldRow label={t('common.prefix')} value={raw.prefix} />
            <FieldRow label={t('common.proxy_url')} value={raw.proxyUrl} />
            <ExcludedModelsList models={excludedModels} />
            <ItemCard.Stats
              success={stats.success}
              failure={stats.failure}
              statusData={statusData}
            />
          </>
        }
        actions={renderActions(resource)}
      />
    );
  };

  const renderOpenAICard = (resource: ProviderResource) => {
    const provider = openAIConfig(resource);
    const stats = getStats(resource, usageByProvider);
    const statusData = getStatusData(resource, usageByProvider);
    const apiKeyEntries = provider.apiKeyEntries || [];

    return (
      <ItemCard
        key={resource.id}
        disabled={resource.disabled}
        compact
        avatar={{
          icon: getProviderIcon('openaiCompatibility', resolvedTheme),
          fallback: PROVIDER_FALLBACKS.openaiCompatibility,
          bgColor: 'transparent',
        }}
        title={provider.name}
        subtitle={provider.baseUrl}
        headerExtra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <KeyCountBadge
              entries={apiKeyEntries}
              providerName={provider.name}
              baseUrl={provider.baseUrl}
              usageByProvider={usageByProvider}
            />
            {provider.priority !== undefined ? (
              <span
                className={ItemCard.styles.typeBadge}
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.10)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <IconNetwork size={12} /> P{provider.priority}
              </span>
            ) : null}
          </div>
        }
        content={
          <>
            <FieldRow label={t('common.prefix')} value={provider.prefix} />
            <FieldRow
              label={t('ai_providers.openai_test_model', { defaultValue: 'Test Model' })}
              value={provider.testModel}
            />
            <ItemCard.Stats
              success={stats.success}
              failure={stats.failure}
              statusData={statusData}
            />
          </>
        }
        actions={renderActions(resource)}
      />
    );
  };

  const renderMultiProtocolCard = (resource: ProviderResource) => (
    <ItemCard
      key={resource.id}
      disabled={resource.disabled}
      compact
      avatar={{
        icon: getProviderIcon(resource.brand, resolvedTheme),
        fallback: resource.identifier.slice(0, 1).toUpperCase(),
        bgColor: 'transparent',
      }}
      title={resource.identifier}
      subtitle={resource.baseUrl}
      headerExtra={renderPriorityBadge(resource.priority)}
      content={
        <>
          <FieldRow label={t('common.prefix')} value={resource.prefix} />
          <FieldRow
            label={t('providersPage.sponsor.protocol', { defaultValue: 'Protocol' })}
            value={resource.flags.protocols?.join(' / ')}
          />
        </>
      }
      actions={renderActions(resource)}
    />
  );

  const renderActions = (resource: ProviderResource) => {
    const cfg = isMultiProtocolSponsorBrand(resource.brand)
      ? null
      : resource.brand === 'openaiCompatibility'
        ? openAIConfig(resource)
        : resource.brand === 'gemini'
          ? geminiConfig(resource)
          : providerKeyConfig(resource);
    const modelsTooltipItems = cfg
      ? (cfg.models || [])
          .filter((model) => model.name?.trim())
          .map((model) => ({ id: model.name, displayName: model.alias }))
      : resource.models.map((name) => ({ id: name }));
    const showModelsButton = modelsTooltipItems.length > 0;

    return (
      <>
        <ItemCard.ActionsMain>
          {showModelsButton && (
            <ItemCard.ModelsButton
              onClick={() => onShowModels(resource)}
              title={t('ai_providers.models_button')}
              tooltip={
                <ItemCard.ModelTooltip
                  models={modelsTooltipItems}
                  loadingText={t('common.loading')}
                  emptyText={t('auth_files.models_empty')}
                />
              }
            />
          )}
          <ItemCard.UtilityActions>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onView(resource)}
              title={t('providersPage.actions.view')}
              aria-label={t('providersPage.actions.view')}
              className={ItemCard.styles.iconButton}
            >
              <IconEye size={15} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(resource)}
              disabled={disableMutations}
              title={t('common.edit')}
              aria-label={t('common.edit')}
              className={ItemCard.styles.iconButton}
            >
              <IconPencil size={15} />
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(resource)}
              disabled={disableMutations}
              title={t('common.delete')}
              aria-label={t('common.delete')}
              className={ItemCard.styles.iconButton}
            >
              <IconTrash2 size={15} />
            </Button>
          </ItemCard.UtilityActions>
        </ItemCard.ActionsMain>
        {onToggleDisabled ? (
          <ItemCard.ToggleArea>
            <ToggleSwitch
              checked={!resource.disabled}
              disabled={disableMutations}
              onChange={(value) => onToggleDisabled(resource, !value)}
            />
          </ItemCard.ToggleArea>
        ) : null}
      </>
    );
  };

  return (
    <ItemCard.Grid>
      {resources.map((resource) => {
        if (resource.brand === 'openaiCompatibility') return renderOpenAICard(resource);
        if (isMultiProtocolSponsorBrand(resource.brand)) return renderMultiProtocolCard(resource);
        return renderCommonCard(resource);
      })}
    </ItemCard.Grid>
  );
}
