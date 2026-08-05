import { HOUR_MS } from '@/utils/time/durations';

export type QuotaRecoveryEventKind = 'window' | 'credit';

export interface QuotaRowInstant {
  rowId: string;
  atMs: number;
  kind: QuotaRecoveryEventKind;
}

export type QuotaScheduleProvider = 'antigravity' | 'claude' | 'codex' | 'kimi' | 'xai';

interface WindowLike {
  id?: string;
  resetAtMs?: number | null;
}

interface ResetCreditLike {
  id?: string;
  status?: string;
  expiresAt?: string;
}

export const XAI_WEEKLY_ROW_ID = 'xai:weekly';

const isUsableMs = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const collectRows = (rows: readonly WindowLike[], fallbackPrefix: string): QuotaRowInstant[] =>
  rows
    .map((row, index): QuotaRowInstant | null =>
      isUsableMs(row.resetAtMs)
        ? {
            rowId: row.id || `${fallbackPrefix}-${index}`,
            atMs: row.resetAtMs,
            kind: 'window',
          }
        : null
    )
    .filter((instant): instant is QuotaRowInstant => instant !== null);

export function resetCreditRowId(
  credit: { id?: string; expiresAt?: string },
  index: number
): string {
  return credit.id || `${credit.expiresAt}-${index}`;
}

export function collectQuotaRowInstants(
  provider: QuotaScheduleProvider,
  quota: unknown
): QuotaRowInstant[] {
  const state = quota as { status?: string } | undefined;
  if (!state || state.status !== 'success') return [];

  if (provider === 'claude' || provider === 'codex') {
    const windows = collectRows((quota as { windows?: WindowLike[] }).windows ?? [], 'window');
    if (provider === 'claude') return windows;

    const credits = (
      (quota as { rateLimitResetCredits?: ResetCreditLike[] }).rateLimitResetCredits ?? []
    )
      .map((credit, index): QuotaRowInstant | null => {
        if (credit.status !== 'available') return null;
        const atMs = Date.parse(credit.expiresAt ?? '');
        return Number.isFinite(atMs)
          ? { rowId: resetCreditRowId(credit, index), atMs, kind: 'credit' }
          : null;
      })
      .filter((instant): instant is QuotaRowInstant => instant !== null);

    return [...windows, ...credits];
  }

  if (provider === 'antigravity') {
    const buckets = ((quota as { groups?: { buckets?: WindowLike[] }[] }).groups ?? []).flatMap(
      (group) => group.buckets ?? []
    );
    return collectRows(buckets, 'bucket');
  }

  if (provider === 'kimi') {
    return collectRows((quota as { rows?: WindowLike[] }).rows ?? [], 'row');
  }

  if (provider === 'xai') {
    const billing = (
      quota as { billing?: { periodType?: string; resetAtMs?: number | null } | null }
    ).billing;
    if (!billing || billing.periodType !== 'weekly' || !isUsableMs(billing.resetAtMs)) return [];
    return [{ rowId: XAI_WEEKLY_ROW_ID, atMs: billing.resetAtMs, kind: 'window' }];
  }

  return [];
}

export function pickSoonestRowId(
  instants: readonly QuotaRowInstant[],
  nowMs: number,
  kind: QuotaRecoveryEventKind = 'window'
): string | null {
  let best: QuotaRowInstant | null = null;
  for (const instant of instants) {
    if (instant.kind !== kind || instant.atMs <= nowMs) continue;
    if (
      best === null ||
      instant.atMs < best.atMs ||
      (instant.atMs === best.atMs && instant.rowId < best.rowId)
    ) {
      best = instant;
    }
  }
  return best?.rowId ?? null;
}

export function pickUrgentRowId(
  instants: readonly QuotaRowInstant[],
  nowMs: number,
  kind: QuotaRecoveryEventKind = 'window'
): string | null {
  return pickSoonestRowId(
    instants.filter(
      (instant) =>
        instant.kind === kind && instant.atMs - nowMs > 0 && instant.atMs - nowMs < HOUR_MS
    ),
    nowMs,
    kind
  );
}

export function nextRecoveryMs(
  provider: QuotaScheduleProvider,
  quota: unknown,
  nowMs: number
): number | null {
  let best: number | null = null;
  for (const instant of collectQuotaRowInstants(provider, quota)) {
    if (instant.kind !== 'window' || instant.atMs <= nowMs) continue;
    if (best === null || instant.atMs < best) best = instant.atMs;
  }
  return best;
}
