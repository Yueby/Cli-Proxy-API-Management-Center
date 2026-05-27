import { useTranslation } from 'react-i18next';
import iconAmp from '@/assets/icons/amp.svg';
import iconClaude from '@/assets/icons/claude.svg';
import iconCodex from '@/assets/icons/codex.svg';
import iconGemini from '@/assets/icons/gemini.svg';
import iconOpenAI from '@/assets/icons/openai-light.svg';
import iconVertex from '@/assets/icons/vertex.svg';
import { Button } from '@/components/ui/Button';
import { ItemCard } from '@/components/ui/ItemCard';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { ModelCategoryBadges } from '@/components/providers/ModelCategoryBadges';
import {
  ExcludedModelsList,
  FieldRow,
  HeaderBadgeList,
  ModelTagList,
  StatsPills,
} from '@/components/providers/ProviderCardParts';
import { ProviderStatusBar } from '@/components/providers/ProviderStatusBar';
import {
  getOpenAIProviderRecentStatusData,
  getOpenAIProviderTotalStats,
  getProviderRecentStatusData,
  getProviderTotalStats,
  stripDisableAllModelsRule,
  type ProviderRecentUsageMap,
} from '@/components/providers/utils';
import { IconPencil, IconSignal, IconTrash2 } from '@/components/ui/icons';
import type {
  AmpcodeConfig,
  GeminiKeyConfig,
  OpenAIProviderConfig,
  ProviderKeyConfig,
} from '@/types';
import type { StatusBarData } from '@/utils/recentRequests';
import { useThemeStore } from '@/stores';
import type { ProviderBrand, ProviderResource } from '../types';
import statusBarStyles from './providerStatusBar.module.scss';

interface ProviderResourceCardsProps {
  resources: ProviderResource[];
  disableMutations?: boolean;
  usageByProvider?: ProviderRecentUsageMap;
  onEdit: (resource: ProviderResource) => void;
  onDelete: (resource: ProviderResource) => void;
  onToggleDisabled?: (resource: ProviderResource, disabled: boolean) => void;
}

const BRAND_META: Record<ProviderBrand, {
  icon: string;
  label: string;
  badgeBg: string;
  badgeColor: string;
  avatarBg?: string;
}> = {
  gemini: {
    icon: iconGemini,
    label: 'Gemini',
    badgeBg: 'rgba(66, 133, 244, 0.10)',
    badgeColor: '#4285f4',
  },
  codex: {
    icon: iconCodex,
    label: 'Codex',
    badgeBg: 'rgba(17, 24, 39, 0.10)',
    badgeColor: '#111827',
  },
  claude: {
    icon: iconClaude,
    label: 'Claude',
    badgeBg: 'rgba(217, 119, 6, 0.10)',
    badgeColor: '#d97706',
  },
  vertex: {
    icon: iconVertex,
    label: 'Vertex',
    badgeBg: 'rgba(52, 168, 83, 0.10)',
    badgeColor: '#34a853',
  },
  openaiCompatibility: {
    icon: iconOpenAI,
    label: 'OpenAI',
    badgeBg: 'rgba(16, 185, 129, 0.10)',
    badgeColor: '#10b981',
  },
  ampcode: {
    icon: iconAmp,
    label: 'Ampcode',
    badgeBg: 'rgba(139, 134, 128, 0.12)',
    badgeColor: 'var(--text-secondary)',
  },
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
const ampcodeConfig = (resource: ProviderResource) => resource.raw as AmpcodeConfig;

const getStatusData = (
  resource: ProviderResource,
  usageByProvider?: ProviderRecentUsageMap
): StatusBarData => {
  if (!usageByProvider || resource.brand === 'ampcode') return EMPTY_STATUS_BAR;
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
  if (!usageByProvider || resource.brand === 'ampcode') return { success: 0, failure: 0 };
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

export function ProviderResourceCards({
  resources,
  disableMutations,
  usageByProvider,
  onEdit,
  onDelete,
  onToggleDisabled,
}: ProviderResourceCardsProps) {
  const { t } = useTranslation();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  const renderCommonCard = (resource: ProviderResource) => {
    const meta = BRAND_META[resource.brand];
    const raw = resource.brand === 'gemini' ? geminiConfig(resource) : providerKeyConfig(resource);
    const excludedModels = stripDisableAllModelsRule(raw.excludedModels);
    const stats = getStats(resource, usageByProvider);
    const statusData = getStatusData(resource, usageByProvider);

    return (
      <ItemCard
        key={resource.id}
        disabled={resource.disabled}
        avatar={{
          icon: meta.icon,
          fallback: meta.label.slice(0, 1),
          bgColor: meta.badgeBg,
          textColor: meta.badgeColor,
        }}
        title={resource.apiKeyPreview ?? resource.identifier}
        badges={[
          {
            label: meta.label,
            variant: 'custom',
            style: { backgroundColor: meta.badgeBg, color: meta.badgeColor },
          },
        ]}
        content={
          <>
            <FieldRow label={t('common.api_key')} value={resource.apiKeyPreview} />
            <FieldRow label={t('common.prefix')} value={raw.prefix} />
            <FieldRow label={t('common.base_url')} value={raw.baseUrl} />
            <FieldRow label={t('common.proxy_url')} value={raw.proxyUrl} />
            <HeaderBadgeList headers={raw.headers} />
            <ModelTagList
              models={raw.models}
              countLabel={t(`ai_providers.${resource.brand === 'gemini' ? 'gemini' : resource.brand}_models_count`, {
                defaultValue: t('providersPage.table.metrics.models'),
              })}
            />
            <ExcludedModelsList models={excludedModels} />
            <StatsPills success={stats.success} failure={stats.failure} />
            <ProviderStatusBar statusData={statusData} styles={statusBarStyles} />
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
    const headerEntries = Object.entries(provider.headers || {});

    return (
      <ItemCard
        key={resource.id}
        disabled={resource.disabled}
        title={provider.name}
        subtitle={provider.baseUrl}
        headerExtra={
          provider.priority !== undefined ? (
            <span
              className={ItemCard.styles.typeBadge}
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.10)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <IconSignal size={12} /> P{provider.priority}
            </span>
          ) : null
        }
        content={
          <>
            <FieldRow label={t('common.prefix')} value={provider.prefix} />
            <FieldRow label={t('providersPage.table.metrics.keys')} value={provider.apiKeyEntries?.length} />
            {headerEntries.length > 0 && <HeaderBadgeList headers={provider.headers} />}
            <ModelCategoryBadges models={provider.models} resolvedTheme={resolvedTheme} />
            <FieldRow label={t('ai_providers.openai_test_model', { defaultValue: 'Test Model' })} value={provider.testModel} />
            <StatsPills success={stats.success} failure={stats.failure} />
            <ProviderStatusBar statusData={statusData} styles={statusBarStyles} />
          </>
        }
        actions={renderActions(resource)}
      />
    );
  };

  const renderAmpcodeCard = (resource: ProviderResource) => {
    const config = ampcodeConfig(resource);

    return (
      <ItemCard
        key={resource.id}
        disabled={resource.disabled}
        avatar={{ icon: BRAND_META.ampcode.icon, fallback: 'A', bgColor: 'transparent' }}
        title="Amp CLI"
        badges={[
          {
            label: BRAND_META.ampcode.label,
            variant: 'custom',
            style: { backgroundColor: BRAND_META.ampcode.badgeBg, color: BRAND_META.ampcode.badgeColor },
          },
        ]}
        content={
          <>
            <FieldRow label={t('ai_providers.ampcode_upstream_url_label', { defaultValue: 'Upstream URL' })} value={config.upstreamUrl} />
            <FieldRow label={t('ai_providers.ampcode_upstream_api_key_label', { defaultValue: 'Upstream API Key' })} value={resource.apiKeyPreview} />
            <FieldRow label={t('ai_providers.ampcode_force_model_mappings_label', { defaultValue: 'Force Model Mappings' })} value={config.forceModelMappings ? t('common.enabled') : undefined} />
            <FieldRow label={t('ai_providers.ampcode_model_mappings_count', { defaultValue: 'Model Mappings' })} value={config.modelMappings?.length || 0} />
            <FieldRow label={t('ai_providers.ampcode_upstream_api_keys_count', { defaultValue: 'Upstream API Keys' })} value={config.upstreamApiKeys?.length || 0} />
            {config.modelMappings && config.modelMappings.length > 0 ? (
              <div className={ItemCard.styles.modelTagList}>
                {config.modelMappings.slice(0, 5).map((mapping) => (
                  <span key={`${mapping.from}→${mapping.to}`} className={ItemCard.styles.modelTag}>
                    <span className={ItemCard.styles.modelName}>{mapping.from}</span>
                    <span className={ItemCard.styles.modelAlias}>{mapping.to}</span>
                  </span>
                ))}
                {config.modelMappings.length > 5 ? (
                  <span className={ItemCard.styles.modelTag}>
                    <span className={ItemCard.styles.modelName}>+{config.modelMappings.length - 5}</span>
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        }
        actions={renderActions(resource)}
      />
    );
  };

  const renderActions = (resource: ProviderResource) => {
    const isAmpcode = resource.brand === 'ampcode';
    return (
      <>
        <ItemCard.ActionsMain>
          <ItemCard.UtilityActions>
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
              disabled={disableMutations || (isAmpcode && resource.flags.isPlaceholder)}
              title={isAmpcode ? t('providersPage.actions.clear') : t('common.delete')}
              aria-label={isAmpcode ? t('providersPage.actions.clear') : t('common.delete')}
              className={ItemCard.styles.iconButton}
            >
              <IconTrash2 size={15} />
            </Button>
          </ItemCard.UtilityActions>
        </ItemCard.ActionsMain>
        {!isAmpcode && onToggleDisabled ? (
          <ItemCard.ToggleArea label={t('ai_providers.config_toggle_label', { defaultValue: 'Enabled' })}>
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
        if (resource.brand === 'ampcode') return renderAmpcodeCard(resource);
        return renderCommonCard(resource);
      })}
    </ItemCard.Grid>
  );
}
