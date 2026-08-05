import { DAY_MS, HOUR_MS, MINUTE_MS } from '@/utils/time/durations';
import { formatInstantShort, isValidInstant } from '@/utils/time/instant';

export interface RelativeTimeParts {
  value: number;
  unit: 'day' | 'hour' | 'minute';
}

export function relativeTimeParts(targetMs: number, nowMs: number): RelativeTimeParts {
  const delta = targetMs - nowMs;
  const sign = delta < 0 ? -1 : 1;
  const absoluteDelta = Math.abs(delta);

  if (absoluteDelta >= DAY_MS) {
    return { value: sign * Math.floor(absoluteDelta / DAY_MS), unit: 'day' };
  }
  if (absoluteDelta >= HOUR_MS) {
    return { value: sign * Math.floor(absoluteDelta / HOUR_MS), unit: 'hour' };
  }
  return {
    value: sign * Math.max(1, Math.floor(absoluteDelta / MINUTE_MS)),
    unit: 'minute',
  };
}

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

const getRelativeFormatter = (locale?: string): Intl.RelativeTimeFormat => {
  const key = locale ?? '';
  const cached = relativeFormatters.get(key);
  if (cached) return cached;

  let formatter: Intl.RelativeTimeFormat;
  try {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
  } catch {
    formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'always' });
  }
  relativeFormatters.set(key, formatter);
  return formatter;
};

export function formatRelativeInstant(
  targetMs: number,
  nowMs: number,
  locale?: string
): string | null {
  if (!isValidInstant(targetMs) || !Number.isFinite(nowMs)) return null;
  const { value, unit } = relativeTimeParts(targetMs, nowMs);
  return getRelativeFormatter(locale).format(value, unit);
}

export interface ResetDisplay {
  absolute: string;
  relative: string | null;
}

export function buildResetDisplay(
  absoluteLabel: string | undefined | null,
  atMs: number | undefined | null,
  nowMs: number,
  locale?: string
): ResetDisplay | null {
  const trimmed = typeof absoluteLabel === 'string' ? absoluteLabel.trim() : '';
  const absolute = trimmed && trimmed !== '-' ? trimmed : null;
  const usableMs = typeof atMs === 'number' && isValidInstant(atMs) ? atMs : null;
  const usableNowMs = typeof nowMs === 'number' && Number.isFinite(nowMs) ? nowMs : null;

  if (absolute === null && usableMs === null) return null;

  return {
    absolute: usableMs === null ? (absolute as string) : formatInstantShort(usableMs),
    relative:
      usableMs === null || usableNowMs === null
        ? null
        : formatRelativeInstant(usableMs, usableNowMs, locale),
  };
}
