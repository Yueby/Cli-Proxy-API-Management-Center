import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useNow } from '@/hooks/useNow';
import {
  KIMI_CONFIG,
  type QuotaRenderHelpers,
} from '@/components/quota/quotaConfigs';
import type { KimiQuotaState } from '@/types';
import { buildKimiQuotaRows } from '@/utils/quota';
import { MINUTE_MS } from '@/utils/time/durations';
import { createSharedClock } from '@/utils/time/sharedClock';
import { formatInstantShort } from '@/utils/time/instant';
import { formatUtcOffsetLabel, resolveTimeZoneLabel } from '@/utils/time/timezone';

function makeFakeTimers() {
  const timers = new Map<number, () => void>();
  let nextId = 1;
  let created = 0;
  let cleared = 0;

  return {
    created: () => created,
    cleared: () => cleared,
    active: () => timers.size,
    fireAll: () => timers.forEach((fn) => fn()),
    setTimer: (fn: () => void) => {
      created += 1;
      const id = nextId++;
      timers.set(id, fn);
      return id;
    },
    clearTimer: (id: unknown) => {
      cleared += 1;
      timers.delete(id as number);
    },
  };
}

describe('shared minute clock port', () => {
  test('exposes a React hook backed by the app-wide shared clock', () => {
    function ClockValue() {
      return createElement('span', null, String(useNow()));
    }

    expect(renderToStaticMarkup(createElement(ClockValue))).toBe('<span>0</span>');
  });

  test('shares one stable timer and restarts after the last subscriber leaves', () => {
    const timers = makeFakeTimers();
    let current = 1_000_000;
    const clock = createSharedClock({
      now: () => current,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    const offA = clock.subscribe(() => {});
    const offB = clock.subscribe(() => {});
    const first = clock.getSnapshot();
    current += MINUTE_MS;

    expect(clock.getSnapshot()).toBe(first);
    expect(clock.subscriberCount()).toBe(2);
    expect(timers.created()).toBe(1);

    timers.fireAll();
    expect(clock.getSnapshot()).toBe(first + MINUTE_MS);

    offA();
    expect(timers.active()).toBe(1);
    offB();
    offB();
    expect(timers.active()).toBe(0);
    expect(timers.cleared()).toBe(1);

    clock.subscribe(() => {});
    expect(timers.created()).toBe(2);
    expect(timers.active()).toBe(1);
  });
});

describe('local time helpers port', () => {
  test('formats browser-local short instants and UTC offsets without hardcoded zones', () => {
    const instant = new Date(2026, 7, 13, 14, 30).getTime();
    expect(formatInstantShort(instant)).toMatch(/^\d{2}[-/]\d{2}.*\d{2}:\d{2}$/);
    expect(formatInstantShort(Number.NaN)).toBe('-');
    expect(formatInstantShort(8_640_000_000_000_001)).toBe('-');
    expect(formatUtcOffsetLabel(480)).toBe('GMT+8');
    expect(formatUtcOffsetLabel(-570)).toBe('GMT-9:30');
    expect(formatUtcOffsetLabel(0)).toBe('GMT');
    expect(resolveTimeZoneLabel()).toMatch(/^GMT([+-]\d{1,2}(:\d{2})?)?$/);
  });
});

describe('Kimi concrete reset time semantic adaptation', () => {
  test('preserves the provider reset instant while building quota rows', () => {
    const resetAtMs = new Date(2026, 7, 13, 14, 30).getTime();
    const rows = buildKimiQuotaRows({
      usage: {
        used: 34,
        limit: 100,
        resetAt: new Date(resetAtMs).toISOString(),
      },
    });

    expect(rows[0]?.resetAtMs).toBe(resetAtMs);
  });

  test('shows the concrete local reset time instead of only a duration hint', () => {
    const resetAtMs = new Date(2026, 7, 13, 14, 30).getTime();
    const quota: KimiQuotaState = {
      status: 'success',
      rows: [
        {
          id: 'summary',
          label: 'Weekly limit',
          used: 34,
          limit: 100,
          resetHint: '3h',
          resetAtMs,
          periodHours: 168,
        },
      ],
    };
    const helpers = {
      styles: new Proxy({}, { get: (_target, key) => String(key) }),
      QuotaProgressBar: ({ percent }: { percent: number | null }) =>
        createElement('span', null, String(percent)),
    } as unknown as QuotaRenderHelpers;
    const t = ((key: string, params?: Record<string, unknown>) => {
      if (key === 'kimi_quota.remaining_percent') return `${params?.percent}%`;
      if (key === 'kimi_quota.reset_hint') return `resets in ${params?.hint}`;
      return key;
    }) as never;

    const markup = renderToStaticMarkup(
      createElement('div', null, KIMI_CONFIG.renderQuotaItems?.(quota, t, helpers))
    );

    expect(markup).toContain(formatInstantShort(resetAtMs));
    expect(markup).not.toContain('resets in 3h');
  });

  test('falls back to the provider hint for a finite but unrepresentable instant', () => {
    const quota: KimiQuotaState = {
      status: 'success',
      rows: [
        {
          id: 'summary',
          label: 'Weekly limit',
          used: 34,
          limit: 100,
          resetHint: '3h',
          resetAtMs: 8_640_000_000_000_001,
          periodHours: 168,
        },
      ],
    };
    const helpers = {
      styles: new Proxy({}, { get: (_target, key) => String(key) }),
      QuotaProgressBar: ({ percent }: { percent: number | null }) =>
        createElement('span', null, String(percent)),
    } as unknown as QuotaRenderHelpers;
    const t = ((key: string, params?: Record<string, unknown>) =>
      key === 'kimi_quota.reset_hint' ? `resets in ${params?.hint}` : key) as never;

    const markup = renderToStaticMarkup(
      createElement('div', null, KIMI_CONFIG.renderQuotaItems?.(quota, t, helpers))
    );

    expect(markup).toContain('resets in ');
    expect(markup).not.toContain('Invalid Date');
  });
});
