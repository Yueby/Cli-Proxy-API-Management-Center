import type { CSSProperties } from 'react';
import type { TFunction } from 'i18next';
import type { AuthFileItem } from '@/types';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const EXPIRING_SOON_DAYS = 3;

export interface CodexSubscriptionBadge {
  label: string;
  title: string;
  style: CSSProperties;
}

type CodexIdTokenInfo = Record<string, unknown>;

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeProvider = (file: AuthFileItem): string =>
  String(file.type ?? file.provider ?? '')
    .trim()
    .toLowerCase();

const resolveCodexIdToken = (file: AuthFileItem): CodexIdTokenInfo | null => {
  const raw = file.id_token ?? file.idToken;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as CodexIdTokenInfo;
};

const formatSubscriptionDateTime = (date: Date, language?: string): string =>
  new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

const formatSubscriptionRemainingLabel = (diffMs: number, t: TFunction): string => {
  if (diffMs >= DAY_MS * 2) {
    return t('auth_files.subscription_expires_in_days', {
      count: Math.floor(diffMs / DAY_MS),
    });
  }
  if (diffMs >= HOUR_MS) {
    return t('auth_files.subscription_expires_in_hours', {
      count: Math.ceil(diffMs / HOUR_MS),
    });
  }
  return t('auth_files.subscription_expires_in_minutes', {
    count: Math.max(1, Math.ceil(diffMs / MINUTE_MS)),
  });
};

const subscriptionBadgeStyle = (status: 'active' | 'soon'): CSSProperties => {
  if (status === 'soon') {
    return {
      backgroundColor: 'var(--amber-10)',
      color: 'var(--amber-text)',
      border: '1px solid var(--amber-30)',
    };
  }
  return {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  };
};

export function resolveCodexSubscriptionBadge(
  file: AuthFileItem,
  t: TFunction,
  language?: string
): CodexSubscriptionBadge | null {
  if (normalizeProvider(file) !== 'codex') return null;

  const idToken = resolveCodexIdToken(file);
  if (!idToken) return null;

  const planType = normalizeString(idToken.plan_type ?? idToken.planType);
  const normalizedPlanType = planType?.toLowerCase();
  if (normalizedPlanType === 'free' || normalizedPlanType === 'free-tier') return null;

  const expiresAtRaw = normalizeString(
    idToken.chatgpt_subscription_active_until ?? idToken.chatgptSubscriptionActiveUntil
  );
  if (!expiresAtRaw) return null;

  const expiresAt = new Date(expiresAtRaw);
  if (Number.isNaN(expiresAt.getTime())) return null;

  const diffMs = expiresAt.getTime() - Date.now();
  if (diffMs <= 0) return null;

  const expiringSoon = Math.ceil(diffMs / DAY_MS) <= EXPIRING_SOON_DAYS;
  const remainingLabel = formatSubscriptionRemainingLabel(diffMs, t);
  const dateTimeLabel = formatSubscriptionDateTime(expiresAt, language);
  const planLabel = planType ?? t('auth_files.subscription_plan_unknown');
  const status = expiringSoon ? 'soon' : 'active';

  return {
    label: remainingLabel,
    title: t('auth_files.subscription_expires_title', {
      plan: planLabel,
      date: dateTimeLabel,
    }),
    style: subscriptionBadgeStyle(status),
  };
}
