/**
 * Formatting functions for quota display.
 */

import type { TFunction } from 'i18next';
import type { CodexUsageWindow } from '@/types';
import { normalizeNumberValue } from './parsers';

function formatRelativeTime(diffMs: number): string {
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const hoursPart = diffHours % 24;
    return hoursPart > 0 ? `in ${diffDays}d ${hoursPart}h` : `in ${diffDays}d`;
  }
  if (diffHours > 0) {
    const minutesPart = diffMinutes % 60;
    return minutesPart > 0 ? `in ${diffHours}h ${minutesPart}m` : `in ${diffHours}h`;
  }
  if (diffMinutes > 0) {
    return `in ${diffMinutes}m`;
  }
  return '< 1m';
}

export function formatQuotaResetTime(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return '-';

  return formatRelativeTime(diffMs);
}

export function formatUnixSeconds(value: number | null): string {
  if (!value) return '-';
  const diffMs = value * 1000 - Date.now();
  if (diffMs <= 0) return '-';

  return formatRelativeTime(diffMs);
}

export function formatCodexResetLabel(window?: CodexUsageWindow | null): string {
  if (!window) return '-';
  const resetAt = normalizeNumberValue(window.reset_at ?? window.resetAt);
  if (resetAt !== null && resetAt > 0) {
    return formatUnixSeconds(resetAt);
  }
  const resetAfter = normalizeNumberValue(window.reset_after_seconds ?? window.resetAfterSeconds);
  if (resetAfter !== null && resetAfter > 0) {
    const targetSeconds = Math.floor(Date.now() / 1000 + resetAfter);
    return formatUnixSeconds(targetSeconds);
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
  return t('kimi_quota.reset_hint', { hint });
}
