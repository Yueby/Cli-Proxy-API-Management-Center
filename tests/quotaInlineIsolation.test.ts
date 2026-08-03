import { describe, expect, test } from 'bun:test';

const quotaLoader = await Bun.file(
  new URL('../src/components/quota/useQuotaLoader.ts', import.meta.url)
).text();
const authFileCard = await Bun.file(
  new URL('../src/features/authFiles/components/AuthFileCard.tsx', import.meta.url)
).text();

describe('inline quota response isolation', () => {
  test('guards generic quota loader commits with the quota cache generation', () => {
    expect(quotaLoader).toContain('captureQuotaCacheGeneration');
    expect(quotaLoader).toContain('commitIfQuotaCacheCurrent');
  });

  test('guards auth-file quota reset commits with the quota cache generation', () => {
    expect(authFileCard).toContain('captureQuotaCacheGeneration');
    expect(authFileCard).toContain('commitIfQuotaCacheCurrent');
  });
});
