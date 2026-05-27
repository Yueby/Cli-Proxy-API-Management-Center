import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconAlertTriangle,
  IconCheckCircle2,
  IconEye,
  IconPencil,
  IconTrash2,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { ItemCard } from '@/components/ui/ItemCard';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { ProviderStatusBar } from '@/components/providers/ProviderStatusBar';
import {
  getOpenAIProviderRecentStatusData,
  getOpenAIProviderTotalStats,
  getProviderRecentStatusData,
  getProviderTotalStats,
  type ProviderRecentUsageMap,
} from '@/components/providers/utils';
import type { OpenAIProviderConfig } from '@/types';
import type { StatusBarData } from '@/utils/recentRequests';
import type { ProviderResource } from '../types';
import statusBarStyles from './providerStatusBar.module.scss';
import styles from './ProviderResourceCards.module.scss';

interface ProviderResourceCardsProps {
  resources: ProviderResource[];
  selectedId?: string | null;
  disableMutations?: boolean;
  usageByProvider?: ProviderRecentUsageMap;
  onView: (resource: ProviderResource) => void;
  onEdit: (resource: ProviderResource) => void;
  onDelete: (resource: ProviderResource) => void;
  onToggleDisabled?: (resource: ProviderResource, disabled: boolean) => void;
}

const resolveStatusBarData = (
  resource: ProviderResource,
  usageByProvider: ProviderRecentUsageMap
): StatusBarData => {
  if (resource.brand === 'openaiCompatibility') {
    return getOpenAIProviderRecentStatusData(
      resource.raw as OpenAIProviderConfig,
      usageByProvider
    );
  }
  return getProviderRecentStatusData(
    usageByProvider,
    resource.brand,
    resource.apiKey ?? undefined,
    resource.baseUrl ?? undefined
  );
};

const resolveTotalStats = (
  resource: ProviderResource,
  usageByProvider: ProviderRecentUsageMap
): { success: number; failure: number } => {
  if (resource.brand === 'openaiCompatibility') {
    return getOpenAIProviderTotalStats(
      resource.raw as OpenAIProviderConfig,
      usageByProvider
    );
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
  selectedId,
  disableMutations,
  usageByProvider,
  onView,
  onEdit,
  onDelete,
  onToggleDisabled,
}: ProviderResourceCardsProps) {
  const { t } = useTranslation();

  const renderStatusBadge = (resource: ProviderResource) => {
    if (resource.brand === 'ampcode' && resource.flags.isPlaceholder) {
      return {
        label: t('providersPage.status.notConfigured'),
        variant: 'warning' as const,
      };
    }
    if (resource.disabled) {
      return {
        label: t('providersPage.status.disabled'),
        variant: 'disabled' as const,
      };
    }
    return {
      label: t('providersPage.status.active'),
      variant: 'active' as const,
    };
  };

  const renderTitle = (resource: ProviderResource) => {
    if (resource.brand === 'openaiCompatibility') return resource.name ?? resource.identifier;
    if (resource.brand === 'ampcode') return 'Amp CLI';
    return resource.apiKeyPreview ?? resource.identifier;
  };

  const renderSubtitle = (resource: ProviderResource): ReactNode => {
    if (resource.authIndex) return <span>auth: {resource.authIndex}</span>;
    if (resource.brand === 'openaiCompatibility') {
      const extra = resource.apiKeyEntryCount > 1 ? ` · +${resource.apiKeyEntryCount - 1}` : '';
      return <span>{(resource.apiKeyPreview ?? '—') + extra}</span>;
    }
    return null;
  };

  const renderContent = (resource: ProviderResource) => {
    const fields = [
      <ItemCard.FieldRow
        key="baseUrl"
        label={t('providersPage.table.baseUrl')}
        value={resource.baseUrl ?? t('providersPage.status.notSet')}
      />,
      <ItemCard.FieldRow
        key="prefix"
        label={t('providersPage.table.prefix')}
        value={resource.prefix ?? t('providersPage.status.none')}
      />,
      <ItemCard.FieldRow
        key="models"
        label={t('providersPage.table.models')}
        value={resource.modelCount}
      />,
    ];

    if (resource.brand === 'openaiCompatibility') {
      fields.push(
        <ItemCard.FieldRow
          key="keys"
          label={t('providersPage.table.metrics.keys')}
          value={resource.apiKeyEntryCount}
        />
      );
    }

    if (resource.headerCount > 0) {
      fields.push(
        <ItemCard.FieldRow
          key="headers"
          label={t('providersPage.table.metrics.headers')}
          value={resource.headerCount}
        />
      );
    }

    return (
      <>
        {fields}
        {usageByProvider && resource.brand !== 'ampcode' ? (
          <>
            {(() => {
              const stats = resolveTotalStats(resource, usageByProvider);
              return (
                <ItemCard.Stats>
                  <ItemCard.StatPill
                    label={t('stats.success')}
                    value={stats.success}
                    variant="success"
                  />
                  <ItemCard.StatPill
                    label={t('stats.failure')}
                    value={stats.failure}
                    variant="failure"
                  />
                </ItemCard.Stats>
              );
            })()}
            <ProviderStatusBar
              statusData={resolveStatusBarData(resource, usageByProvider)}
              styles={statusBarStyles}
            />
          </>
        ) : null}
      </>
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
              className={ItemCard.styles.iconButton}
              aria-label={t('providersPage.actions.view')}
              title={t('providersPage.actions.view')}
              onClick={() => onView(resource)}
            >
              <IconEye size={14} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className={ItemCard.styles.iconButton}
              aria-label={t('providersPage.actions.edit')}
              title={t('providersPage.actions.edit')}
              disabled={disableMutations}
              onClick={() => onEdit(resource)}
            >
              <IconPencil size={14} />
            </Button>
            <Button
              variant="danger"
              size="sm"
              className={ItemCard.styles.iconButton}
              aria-label={
                isAmpcode
                  ? t('providersPage.actions.clear')
                  : t('providersPage.actions.delete')
              }
              title={
                isAmpcode
                  ? t('providersPage.actions.clear')
                  : t('providersPage.actions.delete')
              }
              disabled={disableMutations || (isAmpcode && resource.flags.isPlaceholder)}
              onClick={() => onDelete(resource)}
            >
              <IconTrash2 size={14} />
            </Button>
          </ItemCard.UtilityActions>
        </ItemCard.ActionsMain>
        {!isAmpcode && onToggleDisabled ? (
          <ItemCard.ToggleArea label={t('providersPage.actions.enable')}>
            <ToggleSwitch
              checked={!resource.disabled}
              disabled={disableMutations}
              onChange={(value) => onToggleDisabled(resource, !value)}
              ariaLabel={
                resource.disabled
                  ? t('providersPage.actions.enable')
                  : t('providersPage.actions.disable')
              }
            />
          </ItemCard.ToggleArea>
        ) : null}
      </>
    );
  };

  return (
    <ItemCard.Grid>
      {resources.map((resource) => {
        const status = renderStatusBadge(resource);
        return (
          <ItemCard
            key={resource.id}
            selected={resource.id === selectedId}
            disabled={resource.disabled || resource.flags.isPlaceholder}
            title={renderTitle(resource)}
            subtitle={renderSubtitle(resource)}
            badges={[status]}
            headerExtra={
              resource.brand === 'ampcode' && resource.flags.isPlaceholder ? (
                <IconAlertTriangle size={16} className={styles.warningIcon} />
              ) : resource.disabled ? (
                <IconAlertTriangle size={16} className={styles.warningIcon} />
              ) : (
                <IconCheckCircle2 size={16} className={styles.activeIcon} />
              )
            }
            content={renderContent(resource)}
            actions={renderActions(resource)}
          />
        );
      })}
    </ItemCard.Grid>
  );
}
