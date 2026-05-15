import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ItemCard } from '@/components/ui/ItemCard';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { IconPencil, IconTrash2 } from '@/components/ui/icons';
import { ProviderStatusBar } from '../ProviderStatusBar';
import { FieldRow, HeaderBadgeList, ModelTagList, ExcludedModelsList, StatsPills } from '../ProviderCardParts';
import iconGemini from '@/assets/icons/gemini.svg';
import type { GeminiKeyConfig } from '@/types';
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

interface GeminiSectionProps {
  configs: GeminiKeyConfig[];
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

export function GeminiSection({
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
}: GeminiSectionProps) {
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
          getProviderRecentBuckets(usageByProvider, 'gemini', config.apiKey, config.baseUrl)
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
          title={t('ai_providers.gemini_empty_title')}
          description={t('ai_providers.gemini_empty_desc')}
        />
      );
    }

    return (
      <ItemCard.Grid>
        {sortedItems.map(({ item, index }) => {
          const isDisabled = hasDisableAllModelsRule(item.excludedModels);
          const excludedModels = item.excludedModels ?? [];
          const stats = getProviderTotalStats(usageByProvider, 'gemini', item.apiKey, item.baseUrl);
          const statusData =
            statusBarCache.get(getProviderConfigKey(item, index)) ||
            statusBarDataFromRecentRequests([]);

          return (
            <ItemCard
              key={getProviderConfigKey(item, index)}
              disabled={isDisabled}
              avatar={{
                icon: iconGemini,
                fallback: 'G',
                bgColor: 'rgba(66, 133, 244, 0.10)',
                textColor: '#4285f4',
              }}
              title={maskApiKey(item.apiKey)}
              badges={[
                {
                  label: 'Gemini',
                  variant: 'custom',
                  style: { backgroundColor: 'rgba(66, 133, 244, 0.10)', color: '#4285f4' },
                },
              ]}
              content={
                <>
                  <FieldRow label={t('common.api_key')} value={maskApiKey(item.apiKey)} />
                  <FieldRow label={t('common.prefix')} value={item.prefix} />
                  <FieldRow label={t('common.base_url')} value={item.baseUrl} />
                  <FieldRow label={t('common.proxy_url')} value={item.proxyUrl} />
                  <HeaderBadgeList headers={item.headers} />
                  <ModelTagList models={item.models} countLabel={t('ai_providers.gemini_models_count')} />
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
      icon={iconGemini}
      title={t('ai_providers.gemini_title')}
      configs={configs}
      exportFilename="gemini-configs"
      disabled={actionsDisabled}
      onAdd={onAdd}
      onImport={onImport}
      addLabel={t('ai_providers.gemini_add_button')}
    >
      {renderList()}
    </ProviderCard>
  );
}
