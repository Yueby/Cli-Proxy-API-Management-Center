import { describe, expect, test } from 'bun:test';

const source = await Bun.file(
  new URL('../src/features/providers/sheets/forms/MultiProtocolProviderForm.tsx', import.meta.url)
).text();

describe('multi-protocol provider form styling', () => {
  test('uses the shared themed classes instead of browser-default controls', () => {
    expect(source.match(/className=\{styles\.input\}/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(source).toContain('className={styles.checkboxBox}');
    expect(source).toContain('className={styles.removeBtn}');
    expect(source).toContain('className={styles.addBtn}');
    expect(source).toContain('className={styles.label}');
  });
});
