import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

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

  test('reset scheduling data and urgency selection logic remain available', () => {
    expect(source).toContain('resetAtMs');
    expect(source).toContain('periodHours');
    expect(source).toContain('collectQuotaRowInstants');
    expect(source).toContain('pickUrgentRowId');
  });
});
