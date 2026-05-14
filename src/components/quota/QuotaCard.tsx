/**
 * Generic quota card component.
 */

import { useTranslation } from 'react-i18next';
import type { ReactElement, ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { AuthFileItem, ResolvedTheme } from '@/types';
import { resolveCodexPlanType } from '@/utils/quota/resolvers';
import styles from '@/pages/QuotaPage.module.scss';

type QuotaStatus = 'idle' | 'loading' | 'success' | 'error';

export interface QuotaStatusState {
  status: QuotaStatus;
  error?: string;
  errorStatus?: number;
}

export interface QuotaProgressBarProps {
  percent: number | null;
  highThreshold: number;
  mediumThreshold: number;
}

export function QuotaProgressBar({
  percent,
  highThreshold,
  mediumThreshold
}: QuotaProgressBarProps) {
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  const normalized = percent === null ? null : clamp(percent, 0, 100);
  const fillClass =
    normalized === null
      ? styles.quotaBarFillMedium
      : normalized >= highThreshold
        ? styles.quotaBarFillHigh
        : normalized >= mediumThreshold
          ? styles.quotaBarFillMedium
          : styles.quotaBarFillLow;
  const widthPercent = Math.round(normalized ?? 0);

  return (
    <div className={styles.quotaBar}>
      <div
        className={`${styles.quotaBarFill} ${fillClass}`}
        style={{ width: `${widthPercent}%` }}
      />
    </div>
  );
}

export interface QuotaRenderHelpers {
  styles: typeof styles;
  QuotaProgressBar: (props: QuotaProgressBarProps) => ReactElement;
}

interface QuotaCardProps<TState extends QuotaStatusState> {
  item: AuthFileItem;
  quota?: TState;
  resolvedTheme: ResolvedTheme;
  i18nPrefix: string;
  cardIdleMessageKey?: string;
  cardClassName: string;
  defaultType: string;
  canRefresh?: boolean;
  onRefresh?: () => void;
  renderQuotaItems: (quota: TState, t: TFunction, helpers: QuotaRenderHelpers) => ReactNode;
}

export function QuotaCard<TState extends QuotaStatusState>({
  item,
  quota,
  i18nPrefix,
  cardIdleMessageKey,
  cardClassName,
  canRefresh = false,
  onRefresh,
  renderQuotaItems
}: QuotaCardProps<TState>) {
  const { t } = useTranslation();

  const quotaStatus = quota?.status ?? 'idle';
  const quotaErrorMessage = resolveQuotaErrorMessage(
    t,
    quota?.errorStatus,
    quota?.error || t('common.unknown_error')
  );
  const idleMessageKey = onRefresh ? `${i18nPrefix}.idle` : (cardIdleMessageKey ?? `${i18nPrefix}.idle`);

  // Extract planType: prefer file metadata (always available), fallback to quota state
  const planTypeFromFile = resolveCodexPlanType(item);
  const planTypeFromQuota = quota && 'planType' in quota ? (quota as Record<string, unknown>).planType as string | null | undefined : undefined;
  // Also extract tierLabel for Gemini CLI
  const tierLabel = quota && 'tierLabel' in quota ? (quota as Record<string, unknown>).tierLabel as string | null | undefined : undefined;
  const planType = planTypeFromFile || planTypeFromQuota || tierLabel || null;
  const normalizedPlan = planType ? planType.trim().toLowerCase() : '';
  const isPro = normalizedPlan === 'pro';
  const isProLite = normalizedPlan === 'prolite' || normalizedPlan === 'pro-lite' || normalizedPlan === 'pro_lite';
  const isPlus = normalizedPlan === 'plus' || normalizedPlan === 'chatgpt-plus' || normalizedPlan === 'chatgptplus';
  const isTeam = normalizedPlan === 'team' || normalizedPlan === 'enterprise';
  // Gemini CLI premium tiers
  const tierId = quota && 'tierId' in quota ? (quota as Record<string, unknown>).tierId as string | null | undefined : undefined;
  const isPremiumTier = tierId ? tierId === 'g1-ultra-tier' : false;
  const planBadgeStyle = (isPro || isPremiumTier)
    ? { backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' }
    : isProLite
      ? { backgroundColor: 'rgba(217, 165, 22, 0.15)', color: '#e0aa14', border: '1px solid rgba(217, 165, 22, 0.3)' }
      : isPlus
        ? { backgroundColor: 'rgba(16, 163, 127, 0.12)', color: '#10a37f', border: '1px solid rgba(16, 163, 127, 0.3)' }
        : isTeam
          ? { backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }
          : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };

  return (
    <div className={`${styles.fileCard} ${cardClassName}`}>
      <div className={styles.cardHeader}>
        {planType && (
          <span
            className={styles.typeBadge}
            style={planBadgeStyle}
          >
            {planType}
          </span>
        )}
        <span className={styles.fileName}>{item.name}</span>
      </div>

      <div className={styles.quotaSection}>
        {quotaStatus === 'loading' ? (
          <div className={styles.quotaMessage}>{t(`${i18nPrefix}.loading`)}</div>
        ) : quotaStatus === 'idle' ? (
          onRefresh ? (
            <button
              type="button"
              className={`${styles.quotaMessage} ${styles.quotaMessageAction}`}
              onClick={onRefresh}
              disabled={!canRefresh}
            >
              {t(idleMessageKey)}
            </button>
          ) : (
            <div className={styles.quotaMessage}>{t(idleMessageKey)}</div>
          )
        ) : quotaStatus === 'error' ? (
          <div className={styles.quotaError}>
            {t(`${i18nPrefix}.load_failed`, {
              message: quotaErrorMessage
            })}
          </div>
        ) : quota ? (
          renderQuotaItems(quota, t, { styles, QuotaProgressBar })
        ) : (
          <div className={styles.quotaMessage}>{t(idleMessageKey)}</div>
        )}
      </div>
    </div>
  );
}

const resolveQuotaErrorMessage = (
  t: TFunction,
  status: number | undefined,
  fallback: string
): string => {
  if (status === 404) return t('common.quota_update_required');
  if (status === 403) return t('common.quota_check_credential');
  return fallback;
};
