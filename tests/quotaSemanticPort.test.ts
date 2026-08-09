import { describe, expect, test } from 'bun:test';
import {
  buildResetDisplay,
  formatRelativeInstant,
  relativeTimeParts,
} from '@/utils/time/relativeTime';
import { formatResetCreditExpiry } from '@/utils/quota/resetCredits';
import {
  collectQuotaRowInstants,
  nextRecoveryMs,
  pickUrgentRowId,
  resetCreditRowId,
} from '@/utils/quota/resetSchedule';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '@/utils/time/durations';
import { formatInstantShort } from '@/utils/time/instant';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ANTIGRAVITY_CONFIG,
  CLAUDE_CONFIG,
  CODEX_CONFIG,
  KIMI_CONFIG,
  XAI_CONFIG,
  buildCodexQuotaWindows,
  type QuotaRenderHelpers,
} from '@/components/quota/quotaConfigs';
import type { AntigravityQuotaState, CodexQuotaState, XaiQuotaState } from '@/types';
describe('Codex reset-credit local time adaptation', () => {
  test('formats a valid expiry in the browser-local short format', () => {
    const expiry = '2026-08-13T06:30:00.000Z';
    expect(formatResetCreditExpiry(expiry)).toBe(formatInstantShort(Date.parse(expiry)));
  });

  test('preserves the raw provider value when the expiry is invalid', () => {
    expect(formatResetCreditExpiry('provider-specific-value')).toBe('provider-specific-value');
  });
});

describe('signed relative reset display', () => {
  test('uses truncated countdown units without crossing unit boundaries', () => {
    expect(relativeTimeParts(DAY_MS - 1, 0)).toEqual({ value: 23, unit: 'hour' });
    expect(relativeTimeParts(HOUR_MS - 1, 0)).toEqual({ value: 59, unit: 'minute' });
    expect(relativeTimeParts(MINUTE_MS - 1, 0)).toEqual({ value: 1, unit: 'minute' });
  });

  test('keeps past instants signed instead of presenting them as future', () => {
    expect(relativeTimeParts(0, DAY_MS)).toEqual({ value: -1, unit: 'day' });
    expect(formatRelativeInstant(0, DAY_MS, 'en')).toContain('ago');
  });

  test('derives the local absolute label from the instant instead of trusting a cached relative label', () => {
    const display = buildResetDisplay('08-13 14:30', HOUR_MS, 0, 'en');
    expect(display?.absolute).toBe(formatInstantShort(HOUR_MS));
    expect(display?.relative).toBe('in 1 hour');
  });

  test('returns no relative text for invalid instants instead of throwing', () => {
    expect(formatRelativeInstant(Number.NaN, 0, 'en')).toBeNull();
    expect(formatRelativeInstant(0, Number.NaN, 'en')).toBeNull();
  });

  test('falls back safely for old cache entries and invalid instants', () => {
    expect(buildResetDisplay('cached label', Number.NaN, 0, 'en')).toEqual({
      absolute: 'cached label',
      relative: null,
    });
    expect(buildResetDisplay(null, 120_000, Number.NaN, 'en')).toEqual({
      absolute: formatInstantShort(120_000),
      relative: null,
    });
    expect(buildResetDisplay('', 8_640_000_000_000_001, 0, 'en')).toBeNull();
  });
});

describe('quota renderer time semantics', () => {
  const helpers = {
    styles: new Proxy({}, { get: (_target, key) => String(key) }),
    QuotaProgressBar: ({ percent }: { percent: number | null }) =>
      createElement('span', null, String(percent)),
    nowMs: 0,
    locale: 'en',
  } as unknown as QuotaRenderHelpers;
  const t = ((key: string, params?: Record<string, unknown>) =>
    key.endsWith('remaining_percent') ? `${params?.percent}%` : key) as never;

  test('renders an absolute and live relative label for Claude windows', () => {
    const markup = renderToStaticMarkup(
      createElement(
        'div',
        null,
        CLAUDE_CONFIG.renderQuotaItems(
          {
            status: 'success',
            windows: [
              {
                id: 'five-hour',
                label: 'Five hour',
                usedPercent: 25,
                resetLabel: '08-13 14:30',
                resetAtMs: 30 * MINUTE_MS,
              },
            ],
          },
          t,
          helpers
        )
      )
    );

    expect(markup).toContain(formatInstantShort(30 * MINUTE_MS));
    expect(markup).toContain('in 30 minutes');
    expect(markup).toContain('quotaRowRecoverySoon');
  });

  test('keeps Kimi provider hints when no concrete instant exists', () => {
    const markup = renderToStaticMarkup(
      createElement(
        'div',
        null,
        KIMI_CONFIG.renderQuotaItems(
          {
            status: 'success',
            rows: [{ id: 'summary', label: 'Weekly', used: 1, limit: 10, resetHint: '3h' }],
          },
          ((key: string, params?: Record<string, unknown>) =>
            key === 'kimi_quota.reset_hint'
              ? `resets in ${params?.hint}`
              : key.endsWith('remaining_percent')
                ? `${params?.percent}%`
                : key) as never,
          helpers
        )
      )
    );

    expect(markup).toContain('resets in quota_duration.hour_other');
  });

  test('renders relative labels for Codex, Antigravity and xAI recovery windows', () => {
    const codex: CodexQuotaState = {
      status: 'success',
      windows: [
        {
          id: 'primary',
          label: 'Primary',
          usedPercent: 30,
          resetLabel: 'absolute-codex',
          resetAtMs: HOUR_MS,
        },
      ],
      subscriptionActiveUntil: null,
      rateLimitResetCredits: null,
    };
    const antigravity = {
      status: 'success',
      groups: [
        {
          id: 'group',
          label: 'Group',
          buckets: [
            {
              id: 'bucket',
              label: 'Bucket',
              remainingFraction: 0.7,
              resetTime: 'absolute-antigravity',
              resetAtMs: HOUR_MS,
            },
          ],
        },
      ],
      subscription: null,
      serverTimeOffsetMs: 0,
    } as AntigravityQuotaState;
    const xai = {
      status: 'success',
      billing: {
        mode: 'billing',
        periodType: 'weekly',
        usagePercent: 30,
        productUsage: [],
        monthlyLimitCents: null,
        usedCents: null,
        includedUsedCents: null,
        onDemandCapCents: null,
        onDemandUsedCents: null,
        onDemandUsedPercent: null,
        usedPercent: 30,
        resetAtMs: HOUR_MS,
      },
      payAsYouGoDisabled: false,
    } as XaiQuotaState;
    const render = (node: React.ReactNode) =>
      renderToStaticMarkup(createElement('div', null, node));

    expect(render(CODEX_CONFIG.renderQuotaItems(codex, t, helpers))).toContain('in 1 hour');
    expect(render(ANTIGRAVITY_CONFIG.renderQuotaItems(antigravity, t, helpers))).toContain(
      'in 1 hour'
    );
    expect(render(XAI_CONFIG.renderQuotaItems(xai, t, helpers))).toContain('in 1 hour');
  });

  test('projects Codex reset_after_seconds into a concrete reset instant', () => {
    const originalNow = Date.now;
    Date.now = () => 1_000_000;
    try {
      const windows = buildCodexQuotaWindows(
        {
          rate_limit: {
            primary_window: {
              used_percent: 10,
              reset_after_seconds: 120,
            },
          },
        },
        t
      );

      expect(windows[0]?.resetAtMs).toBe(1_120_000);
    } finally {
      Date.now = originalNow;
    }
  });
});

describe('provider-independent quota recovery schedule', () => {
  const now = 1_000_000;

  test('collects genuine recovery windows but excludes billing rollover', () => {
    expect(
      collectQuotaRowInstants('xai', {
        status: 'success',
        billing: { periodType: 'monthly', resetAtMs: now + HOUR_MS },
      })
    ).toEqual([]);
    expect(
      collectQuotaRowInstants('xai', {
        status: 'success',
        billing: { periodType: 'weekly', resetAtMs: now + HOUR_MS },
      })
    ).toEqual([{ rowId: 'xai:weekly', atMs: now + HOUR_MS, kind: 'window' }]);
  });

  test('keeps Antigravity absolute reset instants unchanged by server-time offset', () => {
    const events = collectQuotaRowInstants(
      'antigravity',
      {
        status: 'success',
        groups: [
          {
            buckets: [{ id: 'server-window', resetAtMs: 30 * MINUTE_MS }],
          },
        ],
      }
    );

    expect(events).toEqual([
      { rowId: 'server-window', atMs: 30 * MINUTE_MS, kind: 'window' },
    ]);
  });

  test('uses one clock domain for Antigravity relative text and urgent selection', () => {
    const quota = {
      status: 'success',
      groups: [
        {
          id: 'group',
          label: 'Group',
          buckets: [
            {
              id: 'server-window',
              label: 'Window',
              remainingFraction: 0.7,
              resetTime: 'absolute-antigravity',
              resetAtMs: 30 * MINUTE_MS,
            },
          ],
        },
      ],
      subscription: null,
      serverTimeOffsetMs: -20 * MINUTE_MS,
    } as AntigravityQuotaState;
    const helpers = {
      styles: new Proxy({}, { get: (_target, key) => String(key) }),
      QuotaProgressBar: ({ percent }: { percent: number | null }) =>
        createElement('span', null, String(percent)),
      nowMs: 0,
      locale: 'en',
    } as unknown as QuotaRenderHelpers;
    const translate = ((key: string, params?: Record<string, unknown>) =>
      key.endsWith('remaining_percent') ? `${params?.percent}%` : key) as never;
    const markup = renderToStaticMarkup(
      createElement(
        'div',
        null,
        ANTIGRAVITY_CONFIG.renderQuotaItems(quota, translate, helpers)
      )
    );

    expect(markup).toContain('in 30 minutes');
    expect(markup).toContain('quotaRowRecoverySoon');
  });

  test('keeps reset-credit expiry distinct from capacity recovery', () => {
    const expiry = new Date(now + 30 * MINUTE_MS).toISOString();
    const instants = collectQuotaRowInstants('codex', {
      status: 'success',
      windows: [{ id: 'five-hour', resetAtMs: now + 20 * MINUTE_MS }],
      rateLimitResetCredits: [{ id: 'credit-1', status: 'available', expiresAt: expiry }],
    });

    expect(instants).toContainEqual({
      rowId: resetCreditRowId({ id: 'credit-1', expiresAt: expiry }, 0),
      atMs: Date.parse(expiry),
      kind: 'credit',
    });
    expect(nextRecoveryMs('codex', { status: 'success', windows: [{ resetAtMs: now + 20 * MINUTE_MS }] }, now)).toBe(
      now + 20 * MINUTE_MS
    );
  });

  test('selects only a capacity recovery in the final hour as urgent', () => {
    expect(
      pickUrgentRowId(
        [
          { rowId: 'credit', atMs: now + 10 * MINUTE_MS, kind: 'credit' },
          { rowId: 'window', atMs: now + 30 * MINUTE_MS, kind: 'window' },
        ],
        now,
        'window'
      )
    ).toBe('window');
    expect(
      pickUrgentRowId([{ rowId: 'window', atMs: now + HOUR_MS, kind: 'window' }], now, 'window')
    ).toBeNull();
  });

  test('selects an expiring credit independently for warning treatment', () => {
    expect(
      pickUrgentRowId(
        [
          { rowId: 'window', atMs: now + 5 * MINUTE_MS, kind: 'window' },
          { rowId: 'credit', atMs: now + 15 * MINUTE_MS, kind: 'credit' },
        ],
        now,
        'credit'
      )
    ).toBe('credit');
  });

  test('marks only the nearest available reset credit as urgent', () => {
    const firstExpiry = new Date(now + 15 * MINUTE_MS).toISOString();
    const laterExpiry = new Date(now + 40 * MINUTE_MS).toISOString();
    const instants = collectQuotaRowInstants('codex', {
      status: 'success',
      windows: [{ id: 'window', resetAtMs: now + 5 * MINUTE_MS }],
      rateLimitResetCredits: [
        { id: 'consumed', status: 'consumed', expiresAt: new Date(now + MINUTE_MS).toISOString() },
        { id: 'first-credit', status: 'available', expiresAt: firstExpiry },
        { id: 'later-credit', status: 'available', expiresAt: laterExpiry },
      ],
    });

    expect(pickUrgentRowId(instants, now, 'credit')).toBe('first-credit');
    expect(pickUrgentRowId(instants, now, 'window')).toBe('window');
  });

  test('wires the urgent reset-credit selection into the Auth Files badge', async () => {
    const card = await Bun.file(
      new URL('../src/features/authFiles/components/AuthFileCard.tsx', import.meta.url)
    ).text();

    expect(card).toContain("pickUrgentRowId(creditInstants, nowMs, 'credit')");
    expect(card).toContain('styles.resetCreditsTooltipRowSoon');
    expect(card).toContain('styles.resetCreditsBadgeSoon');

    const styles = await Bun.file(
      new URL('../src/pages/AuthFilesPage.module.scss', import.meta.url)
    ).text();
    expect(styles).toContain('.resetCreditsBadgeSoon');
    expect(styles).toContain('.resetCreditsTooltipRowSoon');
  });
});
