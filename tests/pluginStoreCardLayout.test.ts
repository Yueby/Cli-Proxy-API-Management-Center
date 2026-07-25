import { describe, expect, test } from 'bun:test';

const styles = await Bun.file(
  new URL('../src/features/plugins/PluginStorePage.module.scss', import.meta.url)
).text();

const block = (selector: string) =>
  styles.match(new RegExp(`\\.${selector}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';

describe('plugin store card header layout', () => {
  test('keeps long titles and badges readable without crowding the logo', () => {
    expect(block('cardHeader')).toContain('display: grid');
    expect(block('cardHeader')).toContain('grid-template-columns: 40px minmax(0, 1fr)');
    expect(block('logoBox')).toContain('grid-column: 1');
    expect(block('cardTitleBlock')).toContain('grid-column: 2');
    expect(block('cardTitle')).toContain('@include text-ellipsis-multiline(2)');
    expect(block('cardBadges')).toContain('grid-row: 2');
    expect(block('cardBadges')).toContain('justify-content: flex-start');
  });
});
