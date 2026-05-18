import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SelectionCheckbox } from '@/components/ui/SelectionCheckbox';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { ItemCard } from '@/components/ui/ItemCard';
import {
  IconDownload,
  IconInfo,
  IconModelCluster,
  IconSettings,
  IconSignal,
  IconTrash2,
} from '@/components/ui/icons';
import { ProviderStatusBar } from '@/components/providers/ProviderStatusBar';
import { useQuotaStore } from '@/stores';
import type { AuthFileItem } from '@/types';
import { resolveAuthProvider } from '@/utils/quota';
import { resolveCodexPlanType } from '@/utils/quota/resolvers';
import {
  normalizeRecentRequestAuthIndex,
  normalizeRecentRequestBuckets,
  normalizeUsageTotal,
  statusBarDataFromRecentRequests,
} from '@/utils/recentRequests';
import { formatFileSize } from '@/utils/format';
import {
  QUOTA_PROVIDER_TYPES,
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
import styles from '@/pages/AuthFilesPage.module.scss';

const HEALTHY_STATUS_MESSAGES = new Set(['ok', 'healthy', 'ready', 'success', 'available']);

export type AuthFileCardProps = {
  file: AuthFileItem;
  compact: boolean;
  selected: boolean;
  resolvedTheme: ResolvedTheme;
  disableControls: boolean;
  deleting: string | null;
  statusUpdating: Record<string, boolean>;
  quotaFilterType: QuotaProviderType | null;
  statusBarCache: Map<string, AuthFileStatusBarData>;
  onShowModels: (file: AuthFileItem) => void;
  onDownload: (name: string) => void;
  onOpenPrefixProxyEditor: (file: AuthFileItem) => void;
  onDelete: (name: string) => void;
  onToggleStatus: (file: AuthFileItem, enabled: boolean) => void;
  onToggleSelect: (name: string) => void;
};

const resolveQuotaType = (file: AuthFileItem): QuotaProviderType | null => {
  const provider = resolveAuthProvider(file);
  if (!QUOTA_PROVIDER_TYPES.has(provider as QuotaProviderType)) return null;
  return provider as QuotaProviderType;
};

export function AuthFileCard(props: AuthFileCardProps) {
  const { t } = useTranslation();
  const {
    file,
    compact,
    selected,
    resolvedTheme,
    disableControls,
    deleting,
    statusUpdating,
    quotaFilterType,
    statusBarCache,
    onShowModels,
    onDownload,
    onOpenPrefixProxyEditor,
    onDelete,
    onToggleStatus,
    onToggleSelect,
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

  const quotaType =
    quotaFilterType && resolveQuotaType(file) === quotaFilterType ? quotaFilterType : null;
  const cachedQuotaType = resolveQuotaType(file);
  const showCachedQuota = Boolean(cachedQuotaType) && !isRuntimeOnly;

  const providerCardClass =
    quotaType === 'antigravity'
      ? styles.antigravityCard
      : quotaType === 'claude'
        ? styles.claudeCard
        : quotaType === 'codex'
          ? styles.codexCard
          : quotaType === 'gemini-cli'
            ? styles.geminiCliCard
            : quotaType === 'kimi'
              ? styles.kimiCard
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
  const noteValue = typeof file.note === 'string' ? file.note.trim() : '';

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
    // Claude planType
    const claudeQ = state.claudeQuota[file.name];
    if (claudeQ && claudeQ.status === 'success' && claudeQ.planType) return claudeQ.planType;
    // Gemini CLI tierLabel
    const geminiQ = state.geminiCliQuota[file.name];
    if (geminiQ && geminiQ.status === 'success' && geminiQ.tierLabel) return geminiQ.tierLabel;
    // Codex planType (from API, may differ from file metadata)
    const codexQ = state.codexQuota[file.name];
    if (codexQ && codexQ.status === 'success' && codexQ.planType) return codexQ.planType;
    return null;
  });
  const resolvedPlanLabel = codexPlan || quotaStorePlan || null;

  // Gemini CLI premium tier detection
  const geminiTierId = useQuotaStore((state) => {
    const q = state.geminiCliQuota[file.name];
    return q && q.status === 'success' ? q.tierId ?? null : null;
  });

  const isPlanPremium = (plan: string) => {
    const normalized = plan.trim().toLowerCase();
    const isPro = normalized === 'pro';
    const isPremiumTier = geminiTierId === 'g1-ultra-tier';
    return (providerKey === 'codex' && isPro) || (providerKey === 'gemini-cli' && isPremiumTier);
  };

  const getPlanBadgeStyle = (plan: string) => {
    const normalized = plan.trim().toLowerCase();
    const isPro = normalized === 'pro';
    const isProLite = normalized === 'prolite' || normalized === 'pro-lite' || normalized === 'pro_lite';
    const isPlus = normalized === 'plus' || normalized === 'chatgpt-plus' || normalized === 'chatgptplus';
    const isTeam = normalized === 'team' || normalized === 'enterprise';

    if (isPlanPremium(plan)) return undefined;

    if (isPro)
      return { backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' };
    if (isProLite)
      return { backgroundColor: 'rgba(217, 165, 22, 0.15)', color: '#e0aa14', border: '1px solid rgba(217, 165, 22, 0.3)' };
    if (isPlus)
      return { backgroundColor: 'rgba(16, 163, 127, 0.12)', color: '#10a37f', border: '1px solid rgba(16, 163, 127, 0.3)' };
    if (isTeam)
      return { backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' };
    return { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
  };

  return (
    <ItemCard
      selected={selected}
      disabled={file.disabled}
      compact={compact}
      className={providerCardClass}
      avatar={{
        icon: providerIcon || undefined,
        fallback: typeLabel.slice(0, 1).toUpperCase(),
        bgColor: typeColor.bg,
        textColor: typeColor.text,
        border: typeColor.border || undefined,
      }}
      title={file.name}
      subtitle={
        !compact && noteValue ? (
          <>
            <span className={styles.noteLabel}>{t('auth_files.note_display')}</span>
            <span className={styles.noteValue}>{noteValue}</span>
          </>
        ) : undefined
      }
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
        // 只在有警告或虚拟文件时显示状态 badge，启用/禁用由 toggle 表达
        ...((isRuntimeOnly || hasStatusWarning) ? [{
          label: stateLabel,
          variant: stateBadgeVariant as 'active' | 'warning' | 'disabled' | 'custom',
          className: isRuntimeOnly ? styles.stateBadgeVirtual : undefined,
        }] : []),
      ]}
      headerExtra={(() => {
        const badges: ReactNode[] = [];

        // Plan/tier badge
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
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.10)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)' }}
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
            <ItemCard.MetaItem
              label={t('auth_files.file_modified')}
              value={formatModified(file)}
            />
          </ItemCard.Meta>

          {/* Health warning */}
          {rawStatusMessage && hasStatusWarning && (
            <div className={styles.healthStatusMessage} title={rawStatusMessage}>
              <IconInfo className={styles.messageIcon} size={14} />
              <span>{rawStatusMessage}</span>
            </div>
          )}

          {/* Stats */}
          <ItemCard.Stats>
            <ItemCard.StatPill label={t('stats.success')} value={fileStats.success} variant="success" />
            <ItemCard.StatPill label={t('stats.failure')} value={fileStats.failure} variant="failure" />
          </ItemCard.Stats>

          {/* Status bar */}
          <ProviderStatusBar statusData={statusData} />

          {/* Quota */}
          {showCachedQuota && cachedQuotaType && (
            <AuthFileQuotaSection file={file} quotaType={cachedQuotaType} />
          )}
        </>
      }
      actions={
        <>
          <ItemCard.ActionsMain>
            {showModelsButton && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onShowModels(file)}
                className={styles.modelsActionButton}
                title={t('auth_files.models_button', { defaultValue: '模型' })}
                disabled={disableControls}
              >
                <>
                  <IconModelCluster size={16} />
                  <span>{t('auth_files.models_button', { defaultValue: '模型' })}</span>
                </>
              </Button>
            )}
            {!isRuntimeOnly && (
              <ItemCard.UtilityActions>
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
                  {deleting === file.name ? (
                    <LoadingSpinner size={14} />
                  ) : (
                    <IconTrash2 size={16} />
                  )}
                </Button>
              </ItemCard.UtilityActions>
            )}
          </ItemCard.ActionsMain>
          {!isRuntimeOnly && (
            <ItemCard.ToggleArea label={t('auth_files.status_toggle_label')}>
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
