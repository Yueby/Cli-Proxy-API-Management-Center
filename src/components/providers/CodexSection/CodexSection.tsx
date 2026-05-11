import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import iconCodex from '@/assets/icons/codex.svg';
import type { ProviderKeyConfig } from '@/types';
import { maskApiKey } from '@/utils/format';
import { statusBarDataFromRecentRequests } from '@/utils/recentRequests';
import styles from '@/pages/AiProvidersPage.module.scss';
import { ProviderCard } from '../ProviderCard';
import { ProviderList } from '../ProviderList';
import { ProviderStatusBar } from '../ProviderStatusBar';
import { FieldRow, HeaderBadgeList, ModelTagList, ExcludedModelsList, StatsPills } from '../ProviderCardParts';
import {
  getProviderConfigKey,
  getProviderRecentBuckets,
  getProviderTotalStats,
  hasDisableAllModelsRule,
  type ProviderRecentUsageMap,
} from '../utils';

interface CodexSectionProps {
  configs: ProviderKeyConfig[];
  usageByProvider: ProviderRecentUsageMap;
  loading: boolean;
  disableControls: boolean;
  isSwitching: boolean;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onToggle: (index: number, enabled: boolean) => void;
  onImport?: () => void;
}

export function CodexSection({
  configs,
  usageByProvider,
  loading,
  disableControls,
  isSwitching,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  onImport,
}: CodexSectionProps) {
  const { t } = useTranslation();
  const actionsDisabled = disableControls || loading || isSwitching;
  const toggleDisabled = disableControls || loading || isSwitching;

  const statusBarCache = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof statusBarDataFromRecentRequests>>();

    configs.forEach((config, index) => {
      if (!config.apiKey) return;
      const configKey = getProviderConfigKey(config, index);
      cache.set(
        configKey,
        statusBarDataFromRecentRequests(
          getProviderRecentBuckets(usageByProvider, 'codex', config.apiKey, config.baseUrl)
        )
      );
    });

    return cache;
  }, [configs, usageByProvider]);

  return (
    <>
      <ProviderCard
        icon={iconCodex}
        title={t('ai_providers.codex_title')}
        configs={configs}
        exportFilename="codex-configs"
        disabled={actionsDisabled}
        onAdd={onAdd}
        onImport={onImport}
        addLabel={t('ai_providers.codex_add_button')}
      >
        <ProviderList<ProviderKeyConfig>
          items={configs}
          loading={loading}
          keyField={(item, index) => getProviderConfigKey(item, index)}
          emptyTitle={t('ai_providers.codex_empty_title')}
          emptyDescription={t('ai_providers.codex_empty_desc')}
          onEdit={(_, index) => onEdit(index)}
          onDelete={(_, index) => onDelete(index)}
          actionsDisabled={actionsDisabled}
          getRowDisabled={(item) => hasDisableAllModelsRule(item.excludedModels)}
          listClassName={styles.providerGrid}
          rowClassName={styles.providerCard}
          rowDisabledClassName={styles.providerCardDisabled}
          metaClassName={styles.providerCardMeta}
          actionsClassName={styles.providerCardActions}
          renderExtraActions={(item, index) => (
            <ToggleSwitch
              label={t('ai_providers.config_toggle_label')}
              checked={!hasDisableAllModelsRule(item.excludedModels)}
              disabled={toggleDisabled}
              onChange={(value) => void onToggle(index, value)}
            />
          )}
          renderContent={(item, index) => {
            const stats = getProviderTotalStats(
              usageByProvider,
              'codex',
              item.apiKey,
              item.baseUrl
            );
            const excludedModels = item.excludedModels ?? [];
            const statusData =
              statusBarCache.get(getProviderConfigKey(item, index)) ||
              statusBarDataFromRecentRequests([]);

            return (
              <Fragment>
                <div className="item-title">{t('ai_providers.codex_item_title')}</div>
                <FieldRow label={t('common.api_key')} value={maskApiKey(item.apiKey)} />
                <FieldRow label={t('common.priority')} value={item.priority} />
                <FieldRow label={t('common.prefix')} value={item.prefix} />
                <FieldRow label={t('common.base_url')} value={item.baseUrl} />
                <FieldRow label={t('common.proxy_url')} value={item.proxyUrl} />
                <FieldRow label={t('ai_providers.codex_websockets_label')} value={item.websockets !== undefined ? (item.websockets ? t('common.yes') : t('common.no')) : undefined} />
                <HeaderBadgeList headers={item.headers} />
                <ModelTagList models={item.models} countLabel={t('ai_providers.codex_models_count')} />
                <ExcludedModelsList models={excludedModels} />
                <StatsPills success={stats.success} failure={stats.failure} />
                <ProviderStatusBar statusData={statusData} />
              </Fragment>
            );
          }}
        />
      </ProviderCard>
    </>
  );
}
