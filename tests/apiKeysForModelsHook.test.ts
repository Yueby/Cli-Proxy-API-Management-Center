import { describe, expect, test } from 'bun:test';

const hook = await Bun.file(
  new URL('../src/hooks/useApiKeysForModels.ts', import.meta.url)
).text();
const dashboard = await Bun.file(
  new URL('../src/pages/DashboardPage.tsx', import.meta.url)
).text();
const system = await Bun.file(new URL('../src/pages/SystemPage.tsx', import.meta.url)).text();

describe('shared API keys resolver for model discovery', () => {
  test('centralizes normalization and cache invalidation in one hook', () => {
    expect(hook).toContain('export function useApiKeysForModels()');
    expect(hook).toContain('cacheRef.current = []');
    expect(hook).toContain('[apiBase, configApiKeys]');
  });

  test('dashboard and system reuse the shared hook instead of duplicated caches', () => {
    expect(dashboard).toContain('useApiKeysForModels');
    expect(system).toContain('useApiKeysForModels');
    expect(dashboard).not.toContain('apiKeysCache');
    expect(system).not.toContain('apiKeysCache');
  });
});
