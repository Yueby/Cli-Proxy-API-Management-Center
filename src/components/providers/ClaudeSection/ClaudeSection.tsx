import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ItemCard } from '@/components/ui/ItemCard';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { IconPencil, IconTrash2 } from '@/components/ui/icons';
import { ProviderStatusBar } from '../ProviderStatusBar';
import { FieldRow, HeaderBadgeList, ModelTagList, ExcludedModelsList, StatsPills } from '../ProviderCardParts';
import iconClaude from '@/assets/icons/claude.svg';
import type { ProviderKeyConfig } from '@/types';
import { maskApiKey } from '@/utils/format';
import { statusBarDataFromRecentRequests } from '@/utils/recentRequests';
import { ProviderCard } from '../ProviderCard';
import {
  getProviderConfigKey,
  getProviderRecentBuckets,
  getProviderTotalStats,
  hasDisableAllModelsRule,
  type ProviderRecentUsageMap,
} from '../utils';

interface ClaudeSectionProps {
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

export function ClaudeSection({
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
}: ClaudeSectionProps) {
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
          getProviderRecentBuckets(usageByProvider, 'claude', config.apiKey, config.baseUrl)
        )
      );
    });
    return cache;
  }, [configs, usageByProvider]);

  const sortedItems = useMemo(() => {
    return configs
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const aDisabled = hasDisableAllModelsRule(a.item.excludedModels) ? 1 : 0;
        const bDisabled = hasDisableAllModelsRule(b.item.excludedModels) ? 1 : 0;
        return aDisabled - bDisabled;
      });
  }, [configs]);

  const renderList = () => {
    if (loading && configs.length === 0) {
      return <div className="hint">{t('common.loading')}</div>;
    }
    if (!configs.length) {
      return (
        <EmptyState
          title={t('ai_providers.claude_empty_title')}
          description={t('ai_providers.claude_empty_desc')}
        />
      );
    }

    return (
      <ItemCard.Grid>
        {sortedItems.map(({ item, index }) => {
          const isDisabled = hasDisableAllModelsRule(item.excludedModels);
          const excludedModels = item.excludedModels ?? [];
          const stats = getProviderTotalStats(usageByProvider, 'claude', item.apiKey, item.baseUrl);
          const statusData =
            statusBarCache.get(getProviderConfigKey(item, index)) ||
            statusBarDataFromRecentRequests([]);

          return (
            <ItemCard
              key={getProviderConfigKey(item, index)}
              disabled={isDisabled}
              avatar={{
                icon: iconClaude,
                fallback: 'C',
                bgColor: 'rgba(210, 168, 120, 0.12)',
                textColor: '#d2a878',
              }}
              title={maskApiKey(item.apiKey)}
              badges={[
                {
                  label: 'Claude',
                  variant: 'custom',
                  style: { backgroundColor: 'rgba(210, 168, 120, 0.12)', color: '#d2a878' },
                },
              ]}
              content={
                <>
                  <FieldRow label={t('common.api_key')} value={maskApiKey(item.apiKey)} />
                  <FieldRow label={t('common.prefix')} value={item.prefix} />
                  <FieldRow label={t('common.base_url')} value={item.baseUrl} />
                  <FieldRow label={t('common.proxy_url')} value={item.proxyUrl} />
                  {item.cloak && (
                    <FieldRow
                      label={t('ai_providers.claude_cloak_mode_label')}
                      value={(() => {
                        const raw = (item.cloak?.mode ?? '').trim().toLowerCase();
                        const key = raw === 'always' || raw === 'never' ? raw : 'auto';
                        return t(`ai_providers.claude_cloak_mode_${key}`);
                      })()}
                    />
                  )}
                  <FieldRow label={t('ai_providers.claude_cloak_strict_label')} value={item.cloak?.strictMode ? t('common.yes') : undefined} />
                  <FieldRow label={t('ai_providers.claude_cloak_sensitive_words_count')} value={item.cloak?.sensitiveWords?.length || undefined} />
                  <HeaderBadgeList headers={item.headers} />
                  <ModelTagList models={item.models} countLabel={t('ai_providers.claude_models_count')} />
                  <ExcludedModelsList models={excludedModels} />
                  <StatsPills success={stats.success} failure={stats.failure} />
                  <ProviderStatusBar statusData={statusData} />
                </>
              }
              actions={
                <>
                  <ItemCard.ActionsMain>
                    <ItemCard.UtilityActions>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEdit(index)}
                        disabled={actionsDisabled}
                        title={t('common.edit')}
                        aria-label={t('common.edit')}
                        className={ItemCard.styles.iconButton}
                      >
                        <IconPencil size={15} />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(index)}
                        disabled={actionsDisabled}
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                        className={ItemCard.styles.iconButton}
                      >
                        <IconTrash2 size={15} />
                      </Button>
                    </ItemCard.UtilityActions>
                  </ItemCard.ActionsMain>
                  <ItemCard.ToggleArea label={t('ai_providers.config_toggle_label')}>
                    <ToggleSwitch
                      checked={!isDisabled}
                      disabled={toggleDisabled}
                      onChange={(value) => void onToggle(index, value)}
                    />
                  </ItemCard.ToggleArea>
                </>
              }
            />
          );
        })}
      </ItemCard.Grid>
    );
  };

  return (
    <ProviderCard
      icon={iconClaude}
      title={t('ai_providers.claude_title')}
      configs={configs}
      exportFilename="claude-configs"
      disabled={actionsDisabled}
      onAdd={onAdd}
      onImport={onImport}
      addLabel={t('ai_providers.claude_add_button')}
    >
      {renderList()}
    </ProviderCard>
  );
}
