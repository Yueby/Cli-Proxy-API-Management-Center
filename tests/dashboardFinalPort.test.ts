import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { getProviderKeyCounts, providerLabel } from '@/utils/dashboard';

const root = new URL('../', import.meta.url);
const source = (path: string) => readFileSync(new URL(path, root), 'utf8');

describe('v1.21.3 final non-promotional dashboard contract', () => {
  test('ships the final operational dashboard and wires the production route to it', () => {
    const routes = source('src/router/MainRoutes.tsx');
    const page = source('src/features/dashboard/DashboardPage.tsx');

    expect(routes).toContain("@/features/dashboard/DashboardPage");
    for (const feature of ['LiveWire', 'Sparkline', 'ThroughputChart', 'Meter', 'useDashboardOverview']) {
      expect(page).toContain(feature);
    }
    for (const forbidden of ['Affiliate', 'Referral', 'Sponsor', 'APIKEY.FUN', 'register', 'recommended', 'sign-up']) {
      expect(page.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  test('retains final metric helpers and Interactions provider semantics', async () => {
    const { axisMax, splitWindowMinutes, toneForSuccessRate } = await import(
      '@/features/dashboard/utils'
    );
    expect(axisMax(112, 4)).toBe(120);
    expect(splitWindowMinutes(300)).toEqual({ hours: 5, minutes: 0 });
    expect(toneForSuccessRate(95)).toBe('good');
    expect(toneForSuccessRate(80)).toBe('warning');
    expect(toneForSuccessRate(79.9)).toBe('critical');
    expect(providerLabel('gemini-interactions', 'Unknown')).toBe('Interactions API');
    expect(getProviderKeyCounts({ interactionsApiKeys: [{ apiKey: 'key-a' }, { apiKey: 'key-b' }] })).toMatchObject({
      interactions: 2,
    });

    const types = source('src/features/dashboard/types.ts');
    const overview = source('src/features/dashboard/hooks/useDashboardOverview.ts');
    expect(types).toContain('TRAFFIC_BUCKET_MINUTES = 15');
    expect(overview).toContain('windowMinutes: buckets.length * TRAFFIC_BUCKET_MINUTES');
    expect(overview).toContain('useProviderRecentRequests');
  });

  test('provides the complete dashboard copy in all four shipped locales', () => {
    const required = [
      'hero_verdict_good',
      'hero_requests_label',
      'success_rate',
      'traffic_title',
      'fleet_title',
      'health_title',
      'runtime_title',
      'cta_title',
    ];
    for (const locale of ['en', 'ru', 'zh-CN', 'zh-TW']) {
      const messages = JSON.parse(source(`src/i18n/locales/${locale}.json`));
      for (const key of required) {
        expect(messages.dashboard?.[key], `${locale}: dashboard.${key}`).toBeTruthy();
      }
    }
  });

  test('includes shared reveal motion plus final ambient and responsive styling', () => {
    const motion = source('src/hooks/motion.ts');
    const styles = source('src/features/dashboard/dashboard.module.scss');
    const themes = source('src/styles/themes.scss');
    expect(motion).toContain('useRevealGroup');
    expect(motion).toContain('prefersReducedMotion');
    expect(styles).toContain('.heroPeriod');
    expect(styles).toContain('.ambient');
    expect(styles).toContain('@media');
    expect(themes).toContain("[data-theme='dark']");
    expect(themes).toContain('--viz-success');
  });
});
