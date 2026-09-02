import { describe, expect, test } from 'bun:test';
import { CODEX_CONFIG, buildClaudeQuotaWindows } from '@/components/quota/quotaConfigs';
import {
  buildAntigravityQuotaGroups,
  buildKimiQuotaRows,
  buildXaiBillingSummary,
  mergeXaiBillingSummaries,
} from '@/utils/quota/builders';
import { normalizeCodexResetCreditsPayload } from '@/utils/quota/resetCredits';
import { projectLane, type TimelineLane } from '@/utils/quota/quotaTimeline';
import { buildDashboardTrafficMetrics } from '@/utils/dashboard';

const t = ((key: string) => key) as never;

describe('v1.21.3 quota semantic port', () => {
  test('supports protobuf Kimi week units and multi-day reset durations', () => {
    const now = Date.now();
    const rows = buildKimiQuotaRows({
      limits: [
        {
          window: { duration: 1, timeUnit: 'TIME_UNIT_WEEK' },
          detail: { used: 2, limit: 10, resetAt: new Date(now + 8 * 86_400_000).toISOString() },
        },
      ],
    });

    expect(rows[0]?.labelParams).toEqual({ duration: '1w' });
    expect(rows[0]?.resetHint).toMatch(/^8d 0h$|^7d 23h$/);
    expect(rows[0]?.periodHours).toBe(168);
    expect(rows[0]?.resetAtMs).toBeGreaterThan(now);
  });

  test('builds the active Claude Fable weekly quota without duplicates', () => {
    const windows = buildClaudeQuotaWindows(
      {
        iguana_necktie: { utilization: 41, resets_at: '2026-07-28T10:00:00Z' },
        limits: [
          {
            kind: 'weekly_scoped',
            percent: 64,
            resets_at: '2026-07-27T10:00:00Z',
            is_active: true,
            scope: { model: { display_name: 'Fable' } },
          },
        ],
      },
      t
    );

    expect(windows.filter((window) => window.id === 'seven-day-fable')).toHaveLength(1);
    expect(windows.find((window) => window.id === 'seven-day-fable')).toMatchObject({
      labelKey: 'claude_quota.seven_day_fable',
      usedPercent: 64,
      periodHours: 168,
      resetAtMs: Date.parse('2026-07-27T10:00:00Z'),
    });
  });

  test('keeps Codex total and applicable reset-credit counts distinct while showing reset support', () => {
    const summary = normalizeCodexResetCreditsPayload({
      available_count: 1,
      applicable_available_count: 0,
    });

    expect(summary).toMatchObject({
      availableCount: 1,
      applicableAvailableCount: 0,
      invalidPayload: false,
    });
    expect(
      CODEX_CONFIG.canResetQuota?.({
        status: 'success',
        windows: [],
        rateLimitResetCreditsAvailableCount: summary.availableCount,
        rateLimitResetCreditsApplicableAvailableCount: summary.applicableAvailableCount,
      })
    ).toBeTrue();
  });

  test('retains Antigravity reset instants and explicit periods for live countdowns', () => {
    const groups = buildAntigravityQuotaGroups({
      groups: [
        {
          displayName: 'Models',
          buckets: [
            {
              displayName: '5 hour limit',
              window: '5h',
              remainingFraction: 0.5,
              resetTime: '2026-08-02T12:00:00Z',
            },
          ],
        },
      ],
    });

    expect(groups[0]?.buckets[0]).toMatchObject({
      resetAtMs: Date.parse('2026-08-02T12:00:00Z'),
      periodHours: 5,
    });
  });

  test('xAI/Grok zero limits compute zero percent for remaining quota, null limits stay null', () => {
    const zeroLimits = buildXaiBillingSummary({
      billingPeriodStart: '2026-08-01T00:00:00Z',
      billingPeriodEnd: '2026-09-01T00:00:00Z',
      monthlyLimit: 0,
      used: 0,
      onDemandCap: 0,
      onDemandUsed: 0,
    });
    expect(zeroLimits).toMatchObject({
      monthlyLimitCents: 0,
      usedCents: 0,
      includedUsedCents: 0,
      usedPercent: 100,
      onDemandCapCents: 0,
      onDemandUsedCents: 0,
      onDemandUsedPercent: 100,
    });

    const nullLimits = buildXaiBillingSummary({
      billingPeriodStart: '2026-08-01T00:00:00Z',
      billingPeriodEnd: '2026-09-01T00:00:00Z',
      monthlyLimit: null,
      used: null,
      onDemandCap: null,
      onDemandUsed: null,
    });
    expect(nullLimits).toMatchObject({
      monthlyLimitCents: null,
      usedCents: null,
      includedUsedCents: null,
      usedPercent: null,
      onDemandCapCents: null,
      onDemandUsedCents: null,
      onDemandUsedPercent: null,
    });
  });

  test('keeps xAI period metadata atomic when weekly and monthly responses merge', () => {
    const weekly = buildXaiBillingSummary({
      currentPeriod: {
        type: 'weekly',
        start: '2026-08-01T00:00:00Z',
        end: '2026-08-08T00:00:00Z',
      },
      creditUsagePercent: 20,
    });
    const monthly = buildXaiBillingSummary({
      billingPeriodStart: '2026-08-01T00:00:00Z',
      billingPeriodEnd: '2026-09-01T00:00:00Z',
      monthlyLimit: 1000,
      used: 100,
    });

    expect(mergeXaiBillingSummaries(weekly, monthly)).toMatchObject({
      periodType: 'weekly',
      periodStart: '2026-08-01T00:00:00Z',
      periodEnd: '2026-08-08T00:00:00Z',
      resetAtMs: Date.parse('2026-08-08T00:00:00Z'),
      periodHours: 168,
    });
  });

  test('does not carry reported usage into projected windows after reset', () => {
    const anchor = Date.parse('2026-08-02T10:00:00Z');
    const lane: TimelineLane = {
      name: 'codex.json',
      displayName: 'Codex',
      provider: 'codex',
      anchorMs: anchor,
      periodHours: 5,
      remaining: 40,
      limits: [],
    };
    const windows = projectLane(
      lane,
      Date.parse('2026-08-02T00:00:00Z'),
      Date.parse('2026-08-03T00:00:00Z'),
      Date.parse('2026-08-02T12:00:00Z'),
      'session'
    );

    expect(windows.find((window) => window.state === 'live')?.remaining).toBeNull();
  });
});

describe('v1.21.3 dashboard data port', () => {
  test('aggregates the real five-hour rolling window without duplicating API-key auth files', () => {
    const metrics = buildDashboardTrafficMetrics(
      new Map([
        [
          'codex',
          new Map([
            [
              'https://example.test|shared-key',
              {
                success: 10,
                failed: 2,
                recentRequests: [
                  { success: 3, failed: 1 },
                  { success: 5, failed: 1 },
                ],
              },
            ],
          ]),
        ],
      ]),
      [
        {
          name: 'duplicate.json',
          type: 'codex',
          account_type: 'api_key',
          account: 'shared-key',
          success: 99,
          failed: 99,
          recent_requests: [{ success: 99, failed: 99 }],
        },
        {
          name: 'claude.json',
          type: 'claude',
          success: 4,
          failed: 0,
          recent_requests: [{ success: 4, failed: 0 }],
        },
      ]
    );

    expect(metrics.totalSuccess).toBe(12);
    expect(metrics.totalFailure).toBe(2);
    expect(metrics.total).toBe(14);
    expect(metrics.windowMinutes).toBe(300);
    expect(metrics.successRate).toBeCloseTo(85.714, 2);
    expect(metrics.throughputPerMinute).toBeCloseTo(14 / 300, 6);
  });
});
