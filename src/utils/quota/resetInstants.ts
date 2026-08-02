const HOUR_MS = 3_600_000;

export function parseIsoToMs(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = new Date(trimmed.replace(/(\.\d{6})\d+/, '$1')).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function parseUnixToMs(value: unknown): number | null {
  const numeric =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric < 1e11 ? numeric * 1000 : numeric;
}

export function parseOffsetSecondsToMs(value: unknown, now: number): number | null {
  const numeric =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return now + numeric * 1000;
}

export function resolveResetMs(candidates: readonly unknown[]): number | null {
  for (const candidate of candidates) {
    const parsed = parseIsoToMs(candidate) ?? parseUnixToMs(candidate);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function periodHoursFromSeconds(value: unknown): number | null {
  const numeric =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
  return Number.isFinite(numeric) && numeric > 0 ? (numeric * 1000) / HOUR_MS : null;
}

export function claudePeriodHours(windowKey: string): number {
  return windowKey === 'five_hour' ? 5 : 24 * 7;
}
