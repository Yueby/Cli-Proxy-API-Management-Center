import { describe, expect, test } from 'bun:test';

const source = await Bun.file(
  new URL('../src/features/providers/sheets/forms/MultiProtocolProviderForm.tsx', import.meta.url)
).text();
const styles = await Bun.file(
  new URL('../src/features/providers/sheets/forms/sharedForm.module.scss', import.meta.url)
).text();

describe('multi-protocol provider form styling', () => {
  test('uses the shared themed classes instead of browser-default controls', () => {
    expect(source.match(/className=\{styles\.input\}/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(source).toContain('className={styles.checkboxBox}');
    expect(source).toContain('className={styles.removeBtn}');
    expect(source).toContain('className={styles.addBtn}');
    expect(source).toContain('className={styles.label}');
  });

  test('uses the provider-sheet card hierarchy and responsive layout classes', () => {
    expect(source).toContain('className={styles.multiProtocolIntro}');
    expect(source).toContain('className={styles.multiProtocolCard}');
    expect(source).toContain('className={styles.multiProtocolCardHeader}');
    expect(source).toContain('className={styles.multiProtocolProtocolField}');
    expect(source).toContain('styles.multiProtocolApiKey');
    expect(source).toContain('className={styles.multiProtocolGrid}');
    expect(source).toContain('className={styles.multiProtocolCardFooter}');
    expect(source).toContain('className={styles.multiProtocolActions}');
  });

  test('uses the project soft-surface style without nested outline cards', () => {
    const cardBlock = styles.match(/\.multiProtocolCard\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const headerBlock = styles.match(/\.multiProtocolCardHeader\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(cardBlock).toContain('border: 0');
    expect(cardBlock).toContain('color-mix');
    expect(cardBlock).toContain('border-radius: $radius-lg');
    expect(headerBlock).not.toContain('border-bottom');
  });
});
