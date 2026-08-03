import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const stylesheet = readFileSync(
  new URL('../src/features/providers/components/ProviderResourceTable.module.scss', import.meta.url),
  'utf8'
);

describe('provider resource table responsive base URL', () => {
  test('lets the base URL shrink to the full width of its table cell', () => {
    const rule = stylesheet.match(/\.baseUrl\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(rule).toContain('display: block');
    expect(rule).toContain('width: 100%');
    expect(rule).toContain('min-width: 0');
    expect(rule).toContain('max-width: 100%');
    expect(rule).not.toContain('max-width: 220px');
  });
});
