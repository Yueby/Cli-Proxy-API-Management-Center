/**
 * Formatting functions for quota display.
 */

import type { TFunction } from 'i18next';
import type { CodexUsageWindow } from '@/types';
import { normalizeNumberValue } from './parsers';

function formatRelativeTime(diffMs: number, t?: TFunction): string {
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (!t) {
    if (diffDays > 0) {
      const hoursPart = diffHours % 24;
      return hoursPart > 0 ? `in ${diffDays}d ${hoursPart}h` : `in ${diffDays}d`;
    }
    if (diffHours > 0) {
      const minutesPart = diffMinutes % 60;
      return minutesPart > 0 ? `in ${diffHours}h ${minutesPart}m` : `in ${diffHours}h`;
    }
    if (diffMinutes > 0) return `in ${diffMinutes}m`;
    return '< 1m';
  }

  if (diffDays > 0) {
    const hoursPart = diffHours % 24;
    return hoursPart > 0
      ? t('quota_time.in_days_hours', { days: diffDays, hours: hoursPart })
      : t('quota_time.in_days', { days: diffDays });
  }
  if (diffHours > 0) {
    const minutesPart = diffMinutes % 60;
    return minutesPart > 0
      ? t('quota_time.in_hours_minutes', { hours: diffHours, minutes: minutesPart })
      : t('quota_time.in_hours', { hours: diffHours });
  }
  if (diffMinutes > 0) {
    return t('quota_time.in_minutes', { minutes: diffMinutes });
  }
  return t('quota_time.less_than_minute');
}

type QuotaDurationUnit = 'day' | 'hour' | 'minute';

const FALLBACK_DURATION_UNIT: Record<QuotaDurationUnit, { one: string; other: string }> = {
  day: { one: 'day', other: 'days' },
  hour: { one: 'hour', other: 'hours' },
  minute: { one: 'minute', other: 'minutes' },
};

function formatQuotaDurationPart(t: TFunction, unit: QuotaDurationUnit, count: number): string {
  const suffix = count === 1 ? 'one' : 'other';
  const fallbackUnit = FALLBACK_DURATION_UNIT[unit][suffix];
  return t(`quota_duration.${unit}_${suffix}`, {
    value: count,
    defaultValue: `${count} ${fallbackUnit}`,
  });
}

export function formatQuotaDurationToken(t: TFunction, token?: string): string {
  if (!token) return '';
  const trimmed = token.trim();
  if (!trimmed) return '';
  if (/^<\s*1\s*m(?:in(?:ute)?s?)?$/i.test(trimmed)) {
    return t('quota_duration.less_than_minute', { defaultValue: '< 1 minute' });
  }

  const parts: string[] = [];
  const matches = trimmed.matchAll(/(\d+)\s*(d|day|days|h|hr|hour|hours|m|min|minute|minutes)\b/gi);
  for (const match of matches) {
    const count = Number(match[1]);
    if (!Number.isFinite(count) || count <= 0) continue;
    const unitToken = match[2].toLowerCase();
    const unit: QuotaDurationUnit = unitToken.startsWith('d')
      ? 'day'
      : unitToken.startsWith('h')
        ? 'hour'
        : 'minute';
    parts.push(formatQuotaDurationPart(t, unit, count));
  }

  if (parts.length === 0) return trimmed;
  return parts.join(t('quota_duration.separator', { defaultValue: ' ' }));
}

export function formatQuotaResetTime(value?: string, t?: TFunction): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return '-';

  return formatRelativeTime(diffMs, t);
}

export function formatUnixSeconds(value: number | null, t?: TFunction): string {
  if (!value) return '-';
  const diffMs = value * 1000 - Date.now();
  if (diffMs <= 0) return '-';

  return formatRelativeTime(diffMs, t);
}

export function formatCodexResetLabel(window?: CodexUsageWindow | null, t?: TFunction): string {
  if (!window) return '-';
  const resetAt = normalizeNumberValue(window.reset_at ?? window.resetAt);
  if (resetAt !== null && resetAt > 0) {
    return formatUnixSeconds(resetAt, t);
  }
  const resetAfter = normalizeNumberValue(window.reset_after_seconds ?? window.resetAfterSeconds);
  if (resetAfter !== null && resetAfter > 0) {
    const targetSeconds = Math.floor(Date.now() / 1000 + resetAfter);
    return formatUnixSeconds(targetSeconds, t);
  }
  return '-';
}

export function createStatusError(message: string, status?: number): Error & { status?: number } {
  const error = new Error(message) as Error & { status?: number };
  if (status !== undefined) {
    error.status = status;
  }
  return error;
}

export function getStatusFromError(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const rawStatus = (err as { status?: unknown }).status;
    if (typeof rawStatus === 'number' && Number.isFinite(rawStatus)) {
      return rawStatus;
    }
    const asNumber = Number(rawStatus);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return asNumber;
    }
  }
  return undefined;
}

export function formatKimiResetHint(t: TFunction, hint?: string): string {
  if (!hint) return '';
  return t('kimi_quota.reset_hint', { hint: formatQuotaDurationToken(t, hint) });
}
