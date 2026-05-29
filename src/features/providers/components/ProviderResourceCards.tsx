import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { ExcludedModelsList, FieldRow } from '@/components/providers/ProviderCardParts';
import {
  getOpenAIProviderRecentStatusData,
  getOpenAIProviderTotalStats,
  getProviderRecentStatusData,
  getProviderTotalStats,
  stripDisableAllModelsRule,
  type ProviderRecentUsageMap,
} from '@/components/providers/utils';
import { IconEye, IconKey, IconPencil, IconSignal, IconTrash2 } from '@/components/ui/icons';
import type {
  AmpcodeConfig,
  GeminiKeyConfig,
  OpenAIProviderConfig,
  ProviderKeyConfig,
} from '@/types';
import type { StatusBarData } from '@/utils/recentRequests';
import { maskApiKey } from '@/utils/format';
import type { ProviderBrand, ProviderResource } from '../types';
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

const BRAND_META: Record<
  ProviderBrand,
  {
    icon: string;
    label: string;
    badgeBg: string;
    badgeColor: string;
    avatarBg?: string;
  }
> = {
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
        title={resource.identifier}
        badges={[
          {
            label: meta.label,
            variant: 'custom',
            style: { backgroundColor: meta.badgeBg, color: meta.badgeColor },
          },
        ]}
        headerExtra={
          resource.apiKeyPreview ? (
            <span
              className={ItemCard.styles.typeBadge}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
                fontSize: '11px',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onView(resource);
              }}
            >
              {resource.apiKeyPreview}
            </span>
          ) : undefined
        }
        content={
          <>
            <FieldRow label={t('common.prefix')} value={raw.prefix} />
            <FieldRow label={t('common.base_url')} value={raw.baseUrl} />
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
                <IconSignal size={12} /> P{provider.priority}
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
            style: {
              backgroundColor: BRAND_META.ampcode.badgeBg,
              color: BRAND_META.ampcode.badgeColor,
            },
          },
        ]}
        headerExtra={
          resource.apiKeyPreview ? (
            <span
              className={ItemCard.styles.typeBadge}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
                fontSize: '11px',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onView(resource);
              }}
            >
              {resource.apiKeyPreview}
            </span>
          ) : undefined
        }
        content={
          <>
            <FieldRow
              label={t('ai_providers.ampcode_upstream_url_label', { defaultValue: 'Upstream URL' })}
              value={config.upstreamUrl}
            />
            <FieldRow
              label={t('ai_providers.ampcode_force_model_mappings_label', {
                defaultValue: 'Force Model Mappings',
              })}
              value={config.forceModelMappings ? t('common.enabled') : undefined}
            />
            <FieldRow
              label={t('ai_providers.ampcode_model_mappings_count', {
                defaultValue: 'Model Mappings',
              })}
              value={config.modelMappings?.length || 0}
            />
            <FieldRow
              label={t('ai_providers.ampcode_upstream_api_keys_count', {
                defaultValue: 'Upstream API Keys',
              })}
              value={config.upstreamApiKeys?.length || 0}
            />
          </>
        }
        actions={renderActions(resource)}
      />
    );
  };

  const renderActions = (resource: ProviderResource) => {
    const isAmpcode = resource.brand === 'ampcode';
    let showModelsButton = false;
    if (resource.brand === 'ampcode') {
      const cfg = ampcodeConfig(resource);
      showModelsButton = !!(cfg.modelMappings && cfg.modelMappings.length > 0);
    } else if (resource.brand === 'openaiCompatibility') {
      const cfg = openAIConfig(resource);
      showModelsButton = !!(cfg.models && cfg.models.length > 0);
    } else {
      const cfg =
        resource.brand === 'gemini' ? geminiConfig(resource) : providerKeyConfig(resource);
      showModelsButton = !!(cfg.models && cfg.models.length > 0);
    }

    return (
      <>
        <ItemCard.ActionsMain>
          {showModelsButton && (
            <ItemCard.ModelsButton
              onClick={() => onShowModels(resource)}
              title={t('ai_providers.models_button')}
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
        if (resource.brand === 'ampcode') return renderAmpcodeCard(resource);
        return renderCommonCard(resource);
      })}
    </ItemCard.Grid>
  );
}
