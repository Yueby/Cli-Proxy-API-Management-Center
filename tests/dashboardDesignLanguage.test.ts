import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('dashboard flat design language', () => {
  test('publishes semantic surface, radius, shadow, typography and motion tokens', () => {
    const themes = source('src/styles/themes.scss');

    for (const token of [
      '--surface-page',
      '--surface-panel',
      '--surface-muted',
      '--surface-floating',
      '--border-subtle',
      '--radius-control',
      '--radius-panel',
      '--shadow-panel',
      '--type-page-title',
      '--motion-hover',
    ]) {
      expect(themes).toContain(token);
    }

    expect(themes).toContain("[data-theme='dark']");
    expect(themes).toContain('@media (prefers-reduced-motion: reduce)');
  });

  test('shared page headers and controls use the flat design tokens', () => {
    const header = source('src/components/common/PageHeader.module.scss');
    const components = source('src/styles/components.scss');

    expect(header).toContain('var(--type-page-title)');
    expect(header).toContain("content: '▍'");
    expect(header).toContain('var(--viz-success)');
    expect(components).toContain('border-radius: var(--radius-control)');
    expect(components).toContain('background: var(--surface-panel)');
    expect(components).toContain('box-shadow: var(--shadow-panel)');
    expect(components).toContain('.btn:hover');
    expect(components).toContain('transform: none');
    expect(components).not.toContain('transition: all $transition-fast');
  });

  test('logs adopts a quiet workspace surface while preserving the terminal viewer', () => {
    const styles = source('src/pages/LogsPage.module.scss');

    expect(styles).not.toContain('max-width: var(--content-max-width)');
    expect(styles).toContain('background: var(--surface-panel)');
    expect(styles).toContain('box-shadow: var(--shadow-panel)');
    expect(styles).toContain('font-family: $font-mono');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  });

  test('system uses flat telemetry tiles and restrained link interactions', () => {
    const styles = source('src/pages/SystemPage.module.scss');

    expect(styles).not.toContain('max-width: var(--content-max-width)');
    expect(styles).toContain('background: var(--surface-panel)');
    expect(styles).toContain('font-family: $font-mono');
    expect(styles).toContain('transform: translateX(3px)');
    expect(styles).toContain('width: 76px');
    expect(styles).toContain('height: 76px');
    expect(styles).toContain('&:hover,');
    expect(styles).toContain('transform: none');
    expect(styles).not.toContain('transform: translateY(-2px)');
    expect(styles).not.toContain('transition: all 0.2s ease');
  });

  test('plugin management and store share the global page header', () => {
    const management = source('src/features/plugins/PluginsPage.tsx');
    const store = source('src/features/plugins/PluginStorePage.tsx');

    for (const page of [management, store]) {
      expect(page).toContain("import { PageHeader } from '@/components/common/PageHeader'");
      expect(page).toContain('<PageHeader');
      expect(page).not.toContain('className={styles.pageHeader}');
    }
  });
});
