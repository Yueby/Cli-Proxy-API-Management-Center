import { describe, expect, test } from 'bun:test';

const source = await Bun.file(
  new URL('../src/components/ui/Select.tsx', import.meta.url)
).text();

describe('shared Select accessibility contract', () => {
  test('uses combobox semantics and gives the portal listbox the same accessible name', () => {
    expect(source).toContain('role="combobox"');
    expect(source).toContain('aria-labelledby={ariaLabelledBy}');
    expect(source.match(/aria-labelledby=\{ariaLabelledBy\}/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
