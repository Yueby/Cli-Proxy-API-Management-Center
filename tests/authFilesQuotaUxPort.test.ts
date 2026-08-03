import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Auth Files quota UX production wiring', () => {
  test('uses typed provider quota bodies instead of the legacy renderQuotaItems callback', () => {
    const section = source('src/features/authFiles/components/AuthFileQuotaSection.tsx');
    expect(section).toContain('bindQuotaClasses');
    expect(section).toContain('<config.Body quota={quota} classes={compactQuotaClasses} />');
    expect(section).not.toContain('config.renderQuotaItems');

    const configs = source('src/components/quota/quotaConfigs.ts');
    for (const provider of ['antigravity', 'claude', 'codex', 'kimi', 'xai']) {
      const bodyName = `${provider[0]!.toUpperCase()}${provider.slice(1)}QuotaBody`;
      expect(configs).toContain(`Body: ${bodyName}`);
      expect(source(`src/features/quota/providers/${provider}/${bodyName}.tsx`)).toContain('QuotaMeter');
    }
  });

  test('the compact Auth Files skin fulfills the complete typed quota class contract', () => {
    const types = source('src/features/quota/types.ts');
    const styles = source('src/features/authFiles/components/AuthFileQuota.module.scss');
    const keys = [...types.matchAll(/^\s*'([a-zA-Z][a-zA-Z0-9]+)',$/gm)].map((match) => match[1]!);
    expect(keys.length).toBeGreaterThan(20);
    for (const key of keys) expect(styles).toContain(`.${key}`);
  });
});

describe('Auth Files quota card interaction contracts', () => {
  test('shows Codex reset from total credits and blocks refresh throughout reset', () => {
    const section = source('src/features/authFiles/components/AuthFileQuotaSection.tsx');
    expect(section).toContain('Boolean(config.canResetQuota?.(quota))');
    expect(section).toMatch(/canRefreshQuota\s*=\s*[\s\S]*!resettingQuota/);
    expect(section).toMatch(/disabled=\{!canUseResetQuota\}/);
    expect(source('src/components/quota/quotaConfigs.ts')).toContain(
      "canResetQuota: (quota) => (quota.rateLimitResetCreditsAvailableCount ?? 0) > 0"
    );
  });

  test('keeps provider cards, existing editing actions, and quota details on the same Auth Files card', () => {
    const card = source('src/features/authFiles/components/AuthFileCard.tsx');
    expect(card).toContain('<AuthFileQuotaSection');
    expect(card).toContain('onOpenPrefixProxyEditor');
    expect(card).toContain('onToggleStatus');
    expect(card).toContain('onDelete');
  });
});

const localeFiles = ['en', 'ru', 'zh-CN', 'zh-TW'];

describe('Auth Files quota UX localization and responsive policy', () => {
  test('ships timeline/detail and credit semantics in all four locales', () => {
    for (const locale of localeFiles) {
      const messages = JSON.parse(source(`src/i18n/locales/${locale}.json`));
      for (const key of ['details', 'timeline_title', 'timeline_empty', 'total_credits', 'applicable_credits']) {
        expect(messages.auth_files?.quota?.[key]).toBeTruthy();
      }
    }
  });

  test('supports mobile, dark theme, entrance/data motion, and reduced-motion opt-out', () => {
    const styles = source('src/features/authFiles/components/AuthFileQuota.module.scss');
    expect(styles).toContain("[data-theme='dark']");
    expect(styles).toContain('@media (max-width:');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toContain('@keyframes quotaDataArrive');
  });
});

describe('quota architecture and promotion policy', () => {
  test('does not restore a standalone quota route or promotional CTA', () => {
    const routes = source('src/router/MainRoutes.tsx');
    expect(routes).toContain("{ path: '/quota', element: <Navigate to=\"/auth-files\" replace /> }");
    expect(routes).not.toMatch(/path:\s*['"]\/quota['"][\s\S]{0,100}<QuotaPage/);
    const section = source('src/features/authFiles/components/AuthFileQuotaSection.tsx');
    expect(section).not.toMatch(/Sponsor|Affiliate|Referral|APIKEY\.FUN|register|recommend|sign-up/i);
  });
});
