import { describe, expect, test } from 'bun:test';
import { buildCodexQuotaWindows } from '@/components/quota/quotaConfigs';

const t = ((key: string) => key) as never;

describe('buildCodexQuotaWindows additional rate limits', () => {
  test('classifies reversed additional windows by duration metadata', () => {
    const windows = buildCodexQuotaWindows(
      {
        additional_rate_limits: [
          {
            limit_name: 'Team',
            rate_limit: {
              primary_window: { limit_window_seconds: 604800, used_percent: 20 },
              secondary_window: { limit_window_seconds: 18000, used_percent: 40 },
            },
          },
        ],
      },
      t
    );

    expect(windows.map((window) => window.labelKey)).toEqual([
      'codex_quota.additional_primary_window',
      'codex_quota.additional_secondary_window',
    ]);
    expect(windows.map((window) => window.usedPercent)).toEqual([40, 20]);
  });

  test('keeps legacy additional primary and secondary placement without duration metadata', () => {
    const windows = buildCodexQuotaWindows(
      {
        additional_rate_limits: [
          {
            limit_name: 'Team',
            rate_limit: {
              primary_window: { used_percent: 20 },
              secondary_window: { used_percent: 40 },
            },
          },
        ],
      },
      t
    );

    expect(windows.map((window) => window.labelKey)).toEqual([
      'codex_quota.additional_primary_window',
      'codex_quota.additional_secondary_window',
    ]);
    expect(windows.map((window) => window.usedPercent)).toEqual([20, 40]);
  });
});
