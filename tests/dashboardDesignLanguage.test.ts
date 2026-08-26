import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

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

  test('shared headers and controls stay flat and avoid decorative motion', () => {
    const themes = source('src/styles/themes.scss');
    const header = source('src/components/common/PageHeader.module.scss');
    const components = source('src/styles/components.scss');

    expect(themes).toContain('--radius-control: 6px');
    expect(themes).toContain('--radius-panel: 8px');
    expect(themes).toContain('--shadow-panel: none');
    expect(header).toContain('var(--type-page-title)');
    expect(header).not.toContain("content: '▍'");
    expect(header).not.toContain('var(--viz-success)');
    expect(components).toContain('border-radius: var(--radius-control)');
    expect(components).toContain('background: var(--surface-panel)');
    expect(components).not.toContain('box-shadow: var(--shadow-panel)');
    expect(components).not.toContain('transform: translateY(-1px)');
    expect(components).not.toContain('transition: all $transition-fast');
  });

  test('logs adopts a quiet workspace surface while preserving the terminal viewer', () => {
    const styles = source('src/pages/LogsPage.module.scss');

    expect(styles).not.toContain('max-width: var(--content-max-width)');
    expect(styles).toContain('background: var(--surface-panel)');
    expect(styles).not.toContain('box-shadow: var(--shadow-panel)');
    expect(styles).toContain('font-family: $font-mono');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  });

  test('system uses flat telemetry tiles and restrained link interactions', () => {
    const styles = source('src/pages/SystemPage.module.scss');

    expect(styles).not.toContain('max-width: var(--content-max-width)');
    expect(styles).toContain('background: var(--surface-panel)');
    expect(styles).toContain('font-family: $font-mono');
    expect(styles).not.toContain('box-shadow: var(--shadow-panel)');
    expect(styles).not.toContain('transform: translateX(3px)');
    expect(styles).toContain('width: 76px');
    expect(styles).toContain('height: 76px');
    expect(styles).toContain('&:hover,');
    expect(styles).toContain('transform: none');
    expect(styles).not.toContain('transform: translateY(-2px)');
    expect(styles).not.toContain('transition: all 0.2s ease');
  });

  test('card header maintains 8-12px balanced spacing with body and avoids top text sticking', () => {
    const components = source('src/styles/components.scss');
    expect(components).toContain('.card-header + .card-body');
    expect(components).toContain('padding-top: $spacing-sm');
  });

  test('pages clean up obsolete scoped page header styles in favor of shared PageHeader component', () => {
    const authFilesStyles = source('src/pages/AuthFilesPage.module.scss');
    const quotaStyles = source('src/pages/QuotaPage.module.scss');
    const configStyles = source('src/pages/ConfigPage.module.scss');

    expect(authFilesStyles).not.toContain('.pageHeader {');
    expect(authFilesStyles).not.toContain('.pageTitle {');
    expect(quotaStyles).not.toContain('.pageHeader {');
    expect(quotaStyles).not.toContain('.pageTitle {');
    expect(configStyles).not.toContain('.pageHeader,');
  });

  test('auth files edit pages use subtle borders and consistent header spacing in settings cards', () => {
    const oauthExcludedStyles = source('src/pages/AuthFilesOAuthExcludedEditPage.module.scss');
    const oauthModelAliasStyles = source('src/pages/AuthFilesOAuthModelAliasEditPage.module.scss');

    expect(oauthExcludedStyles).toContain('border-bottom: 1px solid var(--border-subtle)');
    expect(oauthExcludedStyles).toContain('padding: $spacing-sm $spacing-lg $spacing-lg');
    expect(oauthModelAliasStyles).toContain('border-bottom: 1px solid var(--border-subtle)');
    expect(oauthModelAliasStyles).toContain('padding: $spacing-sm $spacing-lg $spacing-lg');
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

  test('dashboard page adopts available full-width content area without restrictive max-width or centering margin', () => {
    const dashboardStyles = source('src/features/dashboard/dashboard.module.scss');

    expect(dashboardStyles).not.toContain('max-width: 1120px');
    expect(dashboardStyles).not.toContain('margin: 0 auto');
    expect(dashboardStyles).toContain('.page {');
    expect(dashboardStyles).toContain('width: 100%');
    expect(dashboardStyles).toContain('min-width: 0');
    // sectionDescription readable text measure constraint is preserved
    expect(dashboardStyles).toContain('max-width: 64ch');
  });

  test('page transition layers and container use transparent, inherited, or theme page surface without black overlay masks', () => {
    const transitionStyles = source('src/components/common/PageTransition.scss');
    const layoutStyles = source('src/styles/layout.scss');

    // PageTransition component styles
    expect(transitionStyles).not.toContain('background: #000');
    expect(transitionStyles).not.toContain('background: #000000');
    expect(transitionStyles).not.toContain('background: black');
    expect(transitionStyles).not.toContain('background-color: #000');
    expect(transitionStyles).not.toContain('background-color: #000000');
    expect(transitionStyles).not.toContain('background-color: black');
    expect(transitionStyles).not.toContain('background: var(--bg-secondary)');

    expect(transitionStyles).toContain('&__layer {');
    expect(transitionStyles).toMatch(
      /background:\s*(transparent|inherit|var\(--surface-page\)|none);/
    );

    // layout.scss plugin-resource isolation maintains its required white surface without arbitrary overrides
    expect(layoutStyles).toContain('.main-content-plugin-resource {');
    expect(layoutStyles).toContain('.page-transition,');
    expect(layoutStyles).toContain('background: #ffffff;');
  });
});
