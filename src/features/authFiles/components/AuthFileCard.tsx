import { useTranslation } from 'react-i18next';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SelectionCheckbox } from '@/components/ui/SelectionCheckbox';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { ItemCard } from '@/components/ui/ItemCard';
import { Modal } from '@/components/ui/Modal';
import {
  IconDownload,
  IconInfo,
  IconSettings,
  IconSignal,
  IconTrash2,
  IconZap,
} from '@/components/ui/icons';
import { useQuotaStore } from '@/stores';
import { getAntigravityPlanLabel } from '@/components/quota';
import type { AuthFileItem } from '@/types';
import {
  requiresGoogleProjectId,
  resolveCodexPlanType,
  resolveGoogleProjectId,
} from '@/utils/quota/resolvers';
import {
  normalizeRecentRequestAuthIndex,
  normalizeRecentRequestBuckets,
  normalizeUsageTotal,
  statusBarDataFromRecentRequests,
} from '@/utils/recentRequests';
import { formatFileSize } from '@/utils/format';
import {
  formatModified,
  getAuthFileIcon,
  getAuthFileStatusMessage,
  getTypeColor,
  getTypeLabel,
  isRuntimeOnlyAuthFile,
  normalizeProviderKey,
  parsePriorityValue,
  type QuotaProviderType,
  type ResolvedTheme,
} from '@/features/authFiles/constants';
import type { AuthFileStatusBarData } from '@/features/authFiles/hooks/useAuthFilesStatusBarCache';
import { AuthFileQuotaSection } from '@/features/authFiles/components/AuthFileQuotaSection';
import { resolveAuthFileQuotaType } from '@/features/authFiles/quotaConfig';
import { resolveCodexSubscriptionBadge } from '@/features/authFiles/codexSubscription';
import styles from '@/pages/AuthFilesPage.module.scss';

const HEALTHY_STATUS_MESSAGES = new Set(['ok', 'healthy', 'ready', 'success', 'available']);

export type AuthFileCardProps = {
  file: AuthFileItem;
  selected: boolean;
  resolvedTheme: ResolvedTheme;
  disableControls: boolean;
  deleting: string | null;
  statusUpdating: Record<string, boolean>;
  quotaFilterType: QuotaProviderType | null;
  statusBarCache: Map<string, AuthFileStatusBarData>;
  onShowModels: (file: AuthFileItem) => void;
  onPrefetchModels: (file: AuthFileItem) => void;
  getCachedModels: (name: string) => Array<{ id: string; display_name?: string }> | undefined;
  onDownload: (name: string) => void;
  onOpenPrefixProxyEditor: (file: AuthFileItem) => void;
  onDelete: (name: string) => void;
  onToggleStatus: (file: AuthFileItem, enabled: boolean) => void;
  onToggleSelect: (name: string) => void;
  onRefreshQuota: (file: AuthFileItem, quotaType: QuotaProviderType) => void;
};

// Force reload card
export function AuthFileCard(props: AuthFileCardProps) {
  const { t, i18n } = useTranslation();
  const [showStatusDetailModal, setShowStatusDetailModal] = useState(false);
  const {
    file,
    selected,
    resolvedTheme,
    disableControls,
    deleting,
    statusUpdating,
    quotaFilterType,
    statusBarCache,
    onShowModels,
    onPrefetchModels,
    getCachedModels,
    onDownload,
    onOpenPrefixProxyEditor,
    onDelete,
    onToggleStatus,
    onToggleSelect,
    onRefreshQuota,
  } = props;

  const recentBuckets = normalizeRecentRequestBuckets(file.recent_requests ?? file.recentRequests);
  const fileStats = {
    success: normalizeUsageTotal(file.success),
    failure: normalizeUsageTotal(file.failed),
  };
  const isRuntimeOnly = isRuntimeOnlyAuthFile(file);
  const providerKey = normalizeProviderKey(String(file.type ?? file.provider ?? 'unknown'));
  const isAistudio = providerKey === 'aistudio';
  const showModelsButton = !isRuntimeOnly || isAistudio;
  const typeColor = getTypeColor(providerKey, resolvedTheme);
  const typeLabel = getTypeLabel(t, providerKey);
  const providerIcon = getAuthFileIcon(providerKey, resolvedTheme);
  const googleProjectId = resolveGoogleProjectId(file);
  const isMissingGoogleProjectId = requiresGoogleProjectId(file) && !googleProjectId;

  const quotaType =
    quotaFilterType && resolveAuthFileQuotaType(file) === quotaFilterType ? quotaFilterType : null;
  const cachedQuotaType = resolveAuthFileQuotaType(file);
  const showQuota = Boolean(cachedQuotaType) && !isRuntimeOnly;

  const providerCardClass =
    quotaType === 'antigravity'
      ? styles.antigravityCard
      : quotaType === 'claude'
        ? styles.claudeCard
        : quotaType === 'codex'
          ? styles.codexCard
          : quotaType === 'kimi'
            ? styles.kimiCard
            : quotaType === 'xai'
              ? styles.xaiCard
              : '';

  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndexKey = normalizeRecentRequestAuthIndex(rawAuthIndex);
  const statusData =
    (authIndexKey && statusBarCache.get(authIndexKey)) ||
    statusBarDataFromRecentRequests(recentBuckets);
  const rawStatusMessage = getAuthFileStatusMessage(file);
  const hasStatusWarning =
    Boolean(rawStatusMessage) && !HEALTHY_STATUS_MESSAGES.has(rawStatusMessage.toLowerCase());

  const priorityValue = parsePriorityValue(file.priority ?? file['priority']);
  const stateLabel = isRuntimeOnly
    ? t('auth_files.type_virtual') || '虚拟认证文件'
    : file.disabled
      ? t('auth_files.health_status_disabled')
      : hasStatusWarning
        ? t('auth_files.health_status_warning')
        : rawStatusMessage
          ? t('auth_files.health_status_healthy')
          : t('auth_files.status_toggle_label');

  const stateBadgeVariant: 'active' | 'warning' | 'disabled' | 'custom' = isRuntimeOnly
    ? 'custom'
    : file.disabled
      ? 'disabled'
      : hasStatusWarning
        ? 'warning'
        : 'active';

  // Resolve plan/tier badge from file metadata + quota store
  const codexPlan = resolveCodexPlanType(file);
  const quotaStorePlan = useQuotaStore((state) => {
    // Antigravity subscription plan (from quota refresh)
    const antigravityQ = state.antigravityQuota[file.name];
    if (antigravityQ && antigravityQ.status === 'success' && antigravityQ.subscription) {
      return getAntigravityPlanLabel(antigravityQ.subscription, t);
    }
    // Claude planType
    const claudeQ = state.claudeQuota[file.name];
    if (claudeQ && claudeQ.status === 'success' && claudeQ.planType) return claudeQ.planType;
    // Codex planType (from API, may differ from file metadata)
    const codexQ = state.codexQuota[file.name];
    if (codexQ && codexQ.status === 'success' && codexQ.planType) return codexQ.planType;
    return null;
  });
  const codexResetCreditsAvailableCount = useQuotaStore((state) => {
    const quota = state.codexQuota[file.name];
    if (!quota || quota.status !== 'success') return null;
    const count = quota.rateLimitResetCreditsAvailableCount ?? null;
    return typeof count === 'number' && count > 0 ? count : null;
  });
  const resolvedPlanLabel = codexPlan || quotaStorePlan || null;
  const codexSubscriptionBadge = resolveCodexSubscriptionBadge(file, t, i18n.resolvedLanguage);
  const cachedModels = getCachedModels(file.name);

  const isPlanPremium = (plan: string) => {
    const normalized = plan.trim().toLowerCase();
    const isPro = normalized === 'pro';
    const isAntigravityPremium = normalized === 'ultra' || normalized === 'ultra lite';
    return (
      (providerKey === 'codex' && isPro) || (providerKey === 'antigravity' && isAntigravityPremium)
    );
  };

  const getPlanBadgeStyle = (plan: string) => {
    const normalized = plan.trim().toLowerCase();
    const isPro = normalized === 'pro';
    const isProLite =
      normalized === 'prolite' || normalized === 'pro-lite' || normalized === 'pro_lite';
    const isPlus =
      normalized === 'plus' || normalized === 'chatgpt-plus' || normalized === 'chatgptplus';
    const isTeam = normalized === 'team' || normalized === 'enterprise';

    if (isPlanPremium(plan)) return undefined;

    if (isPro)
      return {
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        color: '#8b5cf6',
        border: '1px solid rgba(139, 92, 246, 0.3)',
      };
    if (isProLite)
      return {
        backgroundColor: 'rgba(217, 165, 22, 0.15)',
        color: '#e0aa14',
        border: '1px solid rgba(217, 165, 22, 0.3)',
      };
    if (isPlus)
      return {
        backgroundColor: 'rgba(16, 163, 127, 0.12)',
        color: '#10a37f',
        border: '1px solid rgba(16, 163, 127, 0.3)',
      };
    if (isTeam)
      return {
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        color: '#3b82f6',
        border: '1px solid rgba(59, 130, 246, 0.3)',
      };
    return {
      backgroundColor: 'var(--bg-tertiary)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-color)',
    };
  };

  return (
    <ItemCard
      selected={selected}
      disabled={file.disabled}
      compact
      className={providerCardClass}
      avatar={{
        icon: providerIcon || undefined,
        fallback: typeLabel.slice(0, 1).toUpperCase(),
        bgColor: providerIcon ? 'transparent' : typeColor.bg,
        textColor: typeColor.text,
        border: providerIcon ? '1px solid transparent' : typeColor.border || undefined,
      }}
      title={file.name}
      badges={[
        {
          label: typeLabel,
          variant: 'custom',
          style: {
            backgroundColor: typeColor.bg,
            color: typeColor.text,
            ...(typeColor.border ? { border: typeColor.border } : {}),
          },
        },
        ...(codexSubscriptionBadge
          ? [
              {
                label: codexSubscriptionBadge.label,
                variant: 'custom' as const,
                style: codexSubscriptionBadge.style,
                title: codexSubscriptionBadge.title,
              },
            ]
          : []),
        ...(codexResetCreditsAvailableCount !== null
          ? [
              {
                label: t('codex_quota.reset_credits_badge', {
                  count: codexResetCreditsAvailableCount,
                }),
                variant: 'custom' as const,
                style: {
                  backgroundColor: 'rgba(14, 165, 233, 0.12)',
                  color: '#0284c7',
                  border: '1px solid rgba(14, 165, 233, 0.28)',
                },
                title: t('codex_quota.reset_credits_label'),
              },
            ]
          : []),
        ...(isMissingGoogleProjectId
          ? [
              {
                label: t('auth_files.project_id_missing'),
                variant: 'warning' as const,
                title: t('auth_files.project_id_missing_title'),
              },
            ]
          : []),
        // 只在有警告或虚拟文件时显示状态 badge，启用/禁用由 toggle 表达
        ...(isRuntimeOnly || hasStatusWarning
          ? [
              {
                label: stateLabel,
                variant: stateBadgeVariant as 'active' | 'warning' | 'disabled' | 'custom',
                className: isRuntimeOnly ? styles.stateBadgeVirtual : undefined,
              },
            ]
          : []),
      ]}
      headerExtra={(() => {
        const badges: ReactNode[] = [];

        if (resolvedPlanLabel) {
          const isPremium = isPlanPremium(resolvedPlanLabel);
          badges.push(
            <span
              key="plan"
              className={`${ItemCard.styles.typeBadge} ${isPremium ? styles.premiumPlanValue : ''}`.trim()}
              style={getPlanBadgeStyle(resolvedPlanLabel)}
            >
              {resolvedPlanLabel}
            </span>
          );
        }

        // 优先级 badge
        if (priorityValue !== undefined) {
          badges.push(
            <span
              key="priority"
              className={ItemCard.styles.typeBadge}
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.10)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <IconSignal size={12} /> P{priorityValue}
            </span>
          );
        }

        return badges.length > 0 ? <>{badges}</> : undefined;
      })()}
      selection={
        !isRuntimeOnly ? (
          <SelectionCheckbox
            checked={selected}
            onChange={() => onToggleSelect(file.name)}
            aria-label={
              selected ? t('auth_files.batch_deselect') : t('auth_files.batch_select_all')
            }
            title={selected ? t('auth_files.batch_deselect') : t('auth_files.batch_select_all')}
          />
        ) : undefined
      }
      content={
        <>
          {/* Meta */}
          <ItemCard.Meta>
            <ItemCard.MetaItem
              label={t('auth_files.file_size')}
              value={file.size ? formatFileSize(file.size) : '-'}
            />
            <ItemCard.MetaItem label={t('auth_files.file_modified')} value={formatModified(file)} />
          </ItemCard.Meta>

          {/* Health warning */}
          {rawStatusMessage && hasStatusWarning && (
            <>
              <button
                type="button"
                className={styles.healthStatusMessage}
                title={rawStatusMessage}
                onClick={() => setShowStatusDetailModal(true)}
              >
                <IconInfo className={styles.messageIcon} size={14} />
                <span>{rawStatusMessage}</span>
              </button>

              <Modal
                open={showStatusDetailModal}
                title={t('auth_files.status_detail', { defaultValue: 'Status Detail' })}
                onClose={() => setShowStatusDetailModal(false)}
                footer={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowStatusDetailModal(false)}
                  >
                    {t('common.close')}
                  </Button>
                }
                width={480}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {t('auth_files.status_detail_desc', {
                      defaultValue: 'Detailed warning or error message:',
                    })}
                  </p>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      background: 'var(--bg-secondary)',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: 'var(--text-primary)',
                      maxHeight: '240px',
                      overflowY: 'auto',
                    }}
                  >
                    {rawStatusMessage}
                  </pre>
                </div>
              </Modal>
            </>
          )}

          {/* Stats & Status bar */}
          <ItemCard.Stats
            success={fileStats.success}
            failure={fileStats.failure}
            statusData={statusData}
          />

          {/* Quota */}
          {showQuota && cachedQuotaType && (
            <AuthFileQuotaSection file={file} quotaType={cachedQuotaType} />
          )}
        </>
      }
      actions={
        <>
          <ItemCard.ActionsMain>
            {showModelsButton && (
              <ItemCard.ModelsButton
                onClick={() => onShowModels(file)}
                onMouseEnter={() => onPrefetchModels(file)}
                disabled={disableControls}
                title={t('auth_files.models_button', { defaultValue: '模型' })}
                tooltip={
                  <ItemCard.ModelTooltip
                    models={cachedModels?.map((model) => ({
                      id: model.id,
                      displayName: model.display_name,
                    }))}
                    loading={!cachedModels}
                    loadingText={t('auth_files.models_loading')}
                    emptyText={t('auth_files.models_empty')}
                  />
                }
              />
            )}
            {!isRuntimeOnly && (
              <ItemCard.UtilityActions>
                {showQuota && cachedQuotaType && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onRefreshQuota(file, cachedQuotaType)}
                    className={ItemCard.styles.iconButton}
                    title={t('auth_files.quota_refresh_one')}
                    disabled={disableControls || file.disabled}
                  >
                    <IconZap size={16} />
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onDownload(file.name)}
                  className={ItemCard.styles.iconButton}
                  title={t('auth_files.download_button')}
                  disabled={disableControls}
                >
                  <IconDownload size={16} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenPrefixProxyEditor(file)}
                  className={ItemCard.styles.iconButton}
                  title={t('auth_files.prefix_proxy_button')}
                  disabled={disableControls}
                >
                  <IconSettings size={16} />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(file.name)}
                  className={ItemCard.styles.iconButton}
                  title={t('auth_files.delete_button')}
                  disabled={disableControls || deleting === file.name}
                >
                  {deleting === file.name ? <LoadingSpinner size={14} /> : <IconTrash2 size={16} />}
                </Button>
              </ItemCard.UtilityActions>
            )}
          </ItemCard.ActionsMain>
          {!isRuntimeOnly && (
            <ItemCard.ToggleArea>
              <ToggleSwitch
                ariaLabel={t('auth_files.status_toggle_label')}
                checked={!file.disabled}
                disabled={disableControls || statusUpdating[file.name] === true}
                onChange={(value) => onToggleStatus(file, value)}
              />
            </ItemCard.ToggleArea>
          )}
        </>
      }
    />
  );
}
