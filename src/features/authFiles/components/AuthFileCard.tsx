import { useTranslation } from 'react-i18next';
import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SelectionCheckbox } from '@/components/ui/SelectionCheckbox';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { ItemCard } from '@/components/ui/ItemCard';
import { Modal } from '@/components/ui/Modal';
import {
  IconDownload,
  IconInfo,
  IconRefreshCw,
  IconSettings,
  IconSignal,
  IconTimer,
  IconTrash2,
  IconZap,
} from '@/components/ui/icons';
import {
  captureQuotaCacheGeneration,
  commitIfQuotaCacheCurrent,
  useNotificationStore,
  useQuotaStore,
} from '@/stores';
import { getAntigravityPlanLabel, CODEX_CONFIG } from '@/components/quota';
import { formatShanghaiDateTime } from '@/utils/quota/resetCredits';
import type { AuthFileItem } from '@/types';
import type { CodexRateLimitResetCredit } from '@/types/quota';
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
  isThemeSurfaceIconProvider,
  getThemeSurfaceIconBackground,
  normalizeProviderKey,
  parsePriorityValue,
  supportsAuthFileManualRefresh,
  type QuotaProviderType,
  type ResolvedTheme,
} from '@/features/authFiles/constants';
import type { AuthFileStatusBarData } from '@/features/authFiles/hooks/useAuthFilesStatusBarCache';
import { AuthFileQuotaSection } from '@/features/authFiles/components/AuthFileQuotaSection';
import { resolveAuthFileQuotaType } from '@/features/authFiles/quotaConfig';
import { resolveCodexSubscriptionBadge } from '@/features/authFiles/codexSubscription';
import keyBadgeStyles from '@/components/providers/OpenAISection/KeyCountBadge.module.scss';
import styles from '@/pages/AuthFilesPage.module.scss';

const HEALTHY_STATUS_MESSAGES = new Set(['ok', 'healthy', 'ready', 'success', 'available']);

function ResetCreditsBadge({
  count,
  credits,
  tooltipTitle,
}: {
  count: number;
  credits: CodexRateLimitResetCredit[];
  tooltipTitle: string;
}) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!show) return;
    const dismiss = () => setShow(false);
    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setShow(false);
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

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setShow(true);
  };

  return (
    <>
      <span
        ref={ref}
        className={`${keyBadgeStyles.badge} ${styles.resetCreditsBadge}`}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') handleEnter(); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setShow(false); }}
      >
        <span className={keyBadgeStyles.badgeIcon}>
          <IconTimer size={12} />
        </span>
        <span className={styles.resetCreditsBadgeCount}>{count}</span>
      </span>
      {show && credits.length > 0 &&
        createPortal(
          <div className={keyBadgeStyles.tooltip} style={{ top: pos.top, left: pos.left }}>
            <div className={styles.resetCreditsTooltip}>
              <div className={styles.resetCreditsTooltipTitle}>{tooltipTitle}</div>
              {credits.map((credit, index) => (
                <div key={credit.id || `${credit.expiresAt}-${index}`} className={styles.resetCreditsTooltipRow}>
                  <span className={styles.resetCreditsTooltipIndex}>{index + 1}</span>
                  <span className={styles.resetCreditsTooltipTime}>
                    {formatShanghaiDateTime(credit.expiresAt) || credit.expiresAt}
                  </span>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export type AuthFileCardProps = {
  file: AuthFileItem;
  selected: boolean;
  resolvedTheme: ResolvedTheme;
  disableControls: boolean;
  deleting: string | null;
  statusUpdating: Record<string, boolean>;
  manualRefreshing: Record<string, boolean>;
  quotaFilterType: QuotaProviderType | null;
  statusBarCache: Map<string, AuthFileStatusBarData>;
  onShowModels: (file: AuthFileItem) => void;
  onPrefetchModels: (file: AuthFileItem) => void;
  getCachedModels: (name: string) => Array<{ id: string; display_name?: string }> | undefined;
  onDownload: (name: string) => void;
  onManualRefresh: (file: AuthFileItem) => void;
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
    manualRefreshing,
    quotaFilterType,
    statusBarCache,
    onShowModels,
    onPrefetchModels,
    getCachedModels,
    onDownload,
    onManualRefresh,
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
  const useThemeSurfaceIcon = isThemeSurfaceIconProvider(providerKey);
  const showManualRefreshButton = !isRuntimeOnly && supportsAuthFileManualRefresh(providerKey);
  const isManualRefreshing = manualRefreshing[file.name] === true;
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
    ? t('auth_files.type_virtual')
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
    // xAI planType (from billing quota refresh)
    const xaiQ = state.xaiQuota[file.name];
    if (xaiQ && xaiQ.status === 'success' && xaiQ.planType) return xaiQ.planType;
    return null;
  });
  const xaiPayAsYouGoDisabled = useQuotaStore((state) => {
    const quota = state.xaiQuota[file.name];
    return Boolean(quota && quota.status === 'success' && quota.payAsYouGoDisabled === true);
  });
  const codexResetCreditsAvailableCount = useQuotaStore((state) => {
    const quota = state.codexQuota[file.name];
    if (!quota || quota.status !== 'success') return null;
    const count = quota.rateLimitResetCreditsAvailableCount ?? null;
    return typeof count === 'number' && count > 0 ? count : null;
  });
  const codexResetCredits = useQuotaStore((state) => {
    const quota = state.codexQuota[file.name];
    if (!quota || quota.status !== 'success') return null;
    return (quota.rateLimitResetCredits ?? []) as CodexRateLimitResetCredit[];
  });
  const showNotification = useNotificationStore((state) => state.showNotification);
  const showConfirmation = useNotificationStore((state) => state.showConfirmation);
  const [resettingQuota, setResettingQuota] = useState(false);

  const resetQuotaForFile = useCallback(() => {
    if (disableControls) return;
    if (isRuntimeOnlyAuthFile(file)) return;
    if (file.disabled) return;
    if (resettingQuota) return;

    const config = CODEX_CONFIG as unknown as {
      resetQuota?: (file: AuthFileItem, t: (key: string, opts?: Record<string, unknown>) => string) => Promise<unknown>;
      buildSuccessState: (data: unknown) => unknown;
    };
    const resetQuota = config.resetQuota;
    if (!resetQuota) return;

    showConfirmation({
      title: t('codex_quota.reset_confirm_title'),
      message: t('codex_quota.reset_confirm_message', { name: file.name }),
      confirmText: t('codex_quota.reset_confirm_button'),
      variant: 'primary',
      onConfirm: async () => {
        const cacheGeneration = captureQuotaCacheGeneration();
        setResettingQuota(true);
        try {
          const data = await resetQuota(file, t);
          commitIfQuotaCacheCurrent(cacheGeneration, () => {
            useQuotaStore.getState().setCodexQuota((prev) => ({
              ...prev,
              [file.name]: config.buildSuccessState(data) as never,
            }));
            showNotification(t('codex_quota.reset_success', { name: file.name }), 'success');
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : t('common.unknown_error');
          commitIfQuotaCacheCurrent(cacheGeneration, () => {
            showNotification(t('codex_quota.reset_failed', { name: file.name, message }), 'error');
          });
        } finally {
          setResettingQuota(false);
        }
      },
    });
  }, [disableControls, file, resettingQuota, showConfirmation, showNotification, t]);

  const resolvedPlanLabel = codexPlan || quotaStorePlan || null;
  const xaiPremiumPlusTooltip =
    providerKey === 'xai' && resolvedPlanLabel === 'Premium+'
      ? t('xai_quota.plan_premium_plus_includes_supergrok')
      : undefined;
  const codexSubscriptionBadge = resolveCodexSubscriptionBadge(file, t, i18n.resolvedLanguage);
  const cachedModels = getCachedModels(file.name);

  const isPlanPremium = (plan: string) => {
    const normalized = plan.trim().toLowerCase();
    const isPro = normalized === 'pro';
    const isAntigravityPremium = normalized === 'ultra' || normalized === 'ultra lite';
    const isXaiPremium = normalized === 'supergrok heavy';
    return (
      (providerKey === 'codex' && isPro) ||
      (providerKey === 'antigravity' && isAntigravityPremium) ||
      (providerKey === 'xai' && isXaiPremium)
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
        bgColor: useThemeSurfaceIcon ? getThemeSurfaceIconBackground(resolvedTheme) : providerIcon ? 'transparent' : typeColor.bg,
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
        ...(providerKey === 'xai' && resolvedPlanLabel
          ? [
              {
                label: resolvedPlanLabel,
                variant: 'custom' as const,
                style: getPlanBadgeStyle(resolvedPlanLabel),
                className: isPlanPremium(resolvedPlanLabel) ? styles.premiumPlanValue : '',
                title: xaiPremiumPlusTooltip,
              },
            ]
          : []),
        ...(providerKey === 'xai' && xaiPayAsYouGoDisabled
          ? [
              {
                label: t('xai_quota.pay_as_you_go_disabled'),
                variant: 'custom' as const,
                title: t('xai_quota.pay_as_you_go_disabled'),
                style: {
                  backgroundColor: 'rgba(148, 163, 184, 0.1)',
                  color: 'var(--text-tertiary)',
                  border: '1px solid var(--border-color)',
                },
              },
            ]
          : []),
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
        ...(resolvedPlanLabel && providerKey !== 'xai'
          ? [
              {
                label: resolvedPlanLabel,
                variant: 'custom' as const,
                style: getPlanBadgeStyle(resolvedPlanLabel),
                className: isPlanPremium(resolvedPlanLabel) ? styles.premiumPlanValue : '',
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

        if (codexResetCreditsAvailableCount !== null && codexResetCredits) {
          badges.push(
            <ResetCreditsBadge
              key="reset-credits"
              count={codexResetCreditsAvailableCount}
              credits={codexResetCredits}
              tooltipTitle={t('codex_quota.reset_credits_expiry_label')}
            />
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
              <IconSignal size={12} />
              <span title={t('auth_files.priority_badge_title', { value: priorityValue })}>
                P{priorityValue}
              </span>
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
            <AuthFileQuotaSection file={file} quotaType={cachedQuotaType} disableControls={disableControls} />
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
                title={t('auth_files.models_button')}
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
                {showManualRefreshButton && (
                  <Button variant="secondary" size="sm" onClick={() => onManualRefresh(file)}
                    className={ItemCard.styles.iconButton} title={t('auth_files.manual_refresh_button')}
                    disabled={disableControls || file.disabled || statusUpdating[file.name] === true || isManualRefreshing}
                    loading={isManualRefreshing}>
                    {!isManualRefreshing && <IconRefreshCw size={16} />}
                  </Button>
                )}
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
                {showQuota && cachedQuotaType === 'codex' && codexResetCreditsAvailableCount !== null && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={resetQuotaForFile}
                    className={ItemCard.styles.iconButton}
                    title={t('codex_quota.reset_button')}
                    disabled={disableControls || file.disabled || resettingQuota}
                    loading={resettingQuota}
                  >
                    {!resettingQuota && <IconTimer size={16} />}
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
