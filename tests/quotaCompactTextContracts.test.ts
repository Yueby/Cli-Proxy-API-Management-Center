import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { XAI_CONFIG } from '@/components/quota/quotaConfigs';

const source = readFileSync(
  new URL('../src/components/quota/quotaConfigs.ts', import.meta.url),
  'utf8'
);

const providerRenderers = [
  ['Antigravity', 'renderAntigravityItems', 'renderCodexItems'],
  ['Codex', 'renderCodexItems', 'findFableUsageLimit'],
  ['Claude', 'renderClaudeItems', 'export const CLAUDE_CONFIG'],
  ['Kimi', 'renderKimiItems', 'toXaiRecord'],
  ['xAI', 'renderXaiItems', 'export const KIMI_CONFIG'],
] as const;

const rendererSource = (start: string, end: string): string => {
  const startIndex = source.indexOf(`const ${start}`);
  const endIndex = source.indexOf(end, startIndex + 1);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe('compact quota row text contracts', () => {
  for (const [provider, start, end] of providerRenderers) {
    test(`${provider} uses compact percentage and reset labels`, () => {
      const renderer = rendererSource(start, end);

      expect(renderer).not.toContain('renderResetDisplay(');
      expect(renderer).not.toContain('remaining_percent');
      expect(renderer).not.toContain('quotaRowRecoverySoon');
      if (provider === 'xAI') {
        expect(renderer).toContain('formatXaiPercent(');
        expect(source).toContain("value === null ? '--' : `${Math.round(value)}%`");
      } else {
        expect(renderer).toMatch(/Math\.round\([^)]*\).*%|`\$\{Math\.round\([^)]*\)\}%`/s);
      }
      expect(renderer).toContain('className: styleMap.quotaReset');
    });
  }

  test('Antigravity normalizes remaining suffixes before translating compact bucket labels', () => {
    const renderer = rendererSource('renderAntigravityItems', 'renderCodexItems');

    expect(source).toMatch(
      /normalizeAntigravityQuotaText[\s\S]*replace\(\/\\s\+remaining\$\/i, ''\)/
    );
    expect(source).toContain("['five hour limit', 'five_hour_limit']");
    expect(renderer).toContain('ANTIGRAVITY_BUCKET_LABEL_KEYS');
  });

  test('Antigravity uses the shared quota reset formatter without extra refresh wording', () => {
    const renderer = rendererSource('renderAntigravityItems', 'renderCodexItems');

    expect(renderer).toContain('formatQuotaResetTime(bucket.resetTime, t)');
    expect(renderer).not.toContain('formatAntigravityResetLabel');
    expect(renderer.match(/className: styleMap\.quotaReset/g)).toHaveLength(1);
  });

  test('Antigravity keeps pure percentages and does not truncate quota text in code', () => {
    const renderer = rendererSource('renderAntigravityItems', 'renderCodexItems');

    expect(renderer).toContain('`${Math.round(percent)}%`');
    expect(renderer).not.toMatch(/textOverflow|ellipsis|lineClamp|\.slice\(/);
  });

  test('reset scheduling data and urgency selection logic remain available', () => {
    expect(source).toContain('resetAtMs');
    expect(source).toContain('periodHours');
    expect(source).toContain('collectQuotaRowInstants');
    expect(source).toContain('pickUrgentRowId');
    expect(source).toContain('billingPeriodEnd');
  });

  test('xAI/Grok billing rows follow compact text rules: percentage + dual amount, no visible monthly reset time', () => {
    const renderer = rendererSource('renderXaiItems', 'export const KIMI_CONFIG');

    // Dual-amount formatting helper must format remaining / total, not single amount
    expect(source).toContain('formatXaiRemainingAmount');
    expect(source).toContain('formatXaiOnDemandAmount');
    expect(source).toMatch(/formatXaiRemainingAmount[\s\S]*`\$\{remaining\} \/ \$\{limit\}`/);
    expect(source).toMatch(/formatXaiOnDemandAmount[\s\S]*`\$\{remaining\} \/ \$\{cap\}`/);

    // Weekly row keeps short label + pure percentage + short reset label
    expect(renderer).toContain("t('xai_quota.weekly_limit')");
    expect(renderer).toContain('weeklyResetLabel');

    // Product usage row keeps product name + pure percentage
    expect(renderer).toContain("t('xai_quota.product_usage', { product: item.product })");

    // Pay-as-you-go row keeps short label + pure percentage + dual amount
    expect(renderer).toContain("t('xai_quota.pay_as_you_go_label')");
    expect(renderer).toContain('onDemandPercentLabel');
    expect(renderer).toContain('onDemandAmountLabel');

    // Monthly credits row keeps short label + pure percentage + dual amount, but no visible reset time
    expect(renderer).toContain("t('xai_quota.monthly_credits')");
    expect(renderer).toContain('percentLabel');
    expect(renderer).toContain('amountLabel');

    // Monthly credits must NOT render reset time in quotaMeta to avoid stacking percentage, amount, time
    const monthlyCreditsBlock = renderer.slice(renderer.indexOf("'monthly-credits'"));
    expect(monthlyCreditsBlock).not.toContain('resetLabel');
  });

  test('xAI/Grok renders 0% percentage when limits are explicitly zero, and -- when null', () => {
    // When monthlyLimitCents === 0, percentage must be 0%
    const zeroMonthlyBilling = {
      periodType: 'monthly',
      usagePercent: null,
      monthlyLimitCents: 0,
      usedCents: 0,
      includedUsedCents: 0,
      onDemandCapCents: 0,
      onDemandUsedCents: 0,
      onDemandUsedPercent: null,
      usedPercent: null,
      billingPeriodEnd: '2026-09-01T00:00:00Z',
      productUsage: [],
    };
    const zeroQuotaState = {
      status: 'success',
      billing: zeroMonthlyBilling,
      planType: null,
      payAsYouGoDisabled: true,
    } as any;

    const nullMonthlyBilling = {
      periodType: 'monthly',
      usagePercent: null,
      monthlyLimitCents: null,
      usedCents: null,
      includedUsedCents: null,
      onDemandCapCents: null,
      onDemandUsedCents: null,
      onDemandUsedPercent: null,
      usedPercent: null,
      billingPeriodEnd: '2026-09-01T00:00:00Z',
      productUsage: [],
    };
    const nullQuotaState = {
      status: 'success',
      billing: nullMonthlyBilling,
      planType: null,
      payAsYouGoDisabled: true,
    } as any;

    const mockT = ((key: string) => key) as any;
    const mockHelpers = {
      styles: {
        quotaMessage: 'quotaMessage',
        codexPlan: 'codexPlan',
        codexPlanLabel: 'codexPlanLabel',
        premiumPlanValue: 'premiumPlanValue',
        quotaRow: 'quotaRow',
        quotaRowHeader: 'quotaRowHeader',
        quotaModel: 'quotaModel',
        quotaMeta: 'quotaMeta',
        quotaPercent: 'quotaPercent',
        quotaAmount: 'quotaAmount',
        quotaReset: 'quotaReset',
      },
      QuotaProgressBar: () => null,
      nowMs: Date.now(),
    } as any;

    const zeroElement = XAI_CONFIG.renderQuotaItems(zeroQuotaState, mockT, mockHelpers);
    const zeroMarkup = renderToStaticMarkup(createElement('div', null, zeroElement));
    expect(zeroMarkup).toContain('<span class="quotaPercent">0%</span>');
    expect(zeroMarkup).toContain('<span class="quotaAmount">$0.00 / $0.00</span>');
    expect(zeroMarkup).not.toContain('<span class="quotaPercent">--</span>');

    const nullElement = XAI_CONFIG.renderQuotaItems(nullQuotaState, mockT, mockHelpers);
    const nullMarkup = renderToStaticMarkup(createElement('div', null, nullElement));
    expect(nullMarkup).toContain('<span class="quotaPercent">--</span>');
    expect(nullMarkup).toContain('<span class="quotaAmount">--</span>');
  });
});
