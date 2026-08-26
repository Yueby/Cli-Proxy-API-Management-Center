import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('shared UI components design contracts (Phase 1)', () => {
  describe('tokens and themes', () => {
    test('publishes required shared control height, radius, surface, and focus ring tokens', () => {
      const themes = source('src/styles/themes.scss');

      expect(themes).toContain('--radius-control: 6px');
      expect(themes).toContain('--radius-panel: 8px');
      expect(themes).toContain('--shadow-panel: none');
      expect(themes).toContain('--surface-page');
      expect(themes).toContain('--surface-panel');
      expect(themes).toContain('--surface-muted');
      expect(themes).toContain('--surface-floating');
      expect(themes).toContain('--border-subtle');
      expect(themes).toContain('--motion-hover: 160ms ease');
    });
  });

  describe('Button component', () => {
    test('matches 32px standard / 28px sm height, radius-control, semantic colors, and no translate on hover', () => {
      const components = source('src/styles/components.scss');

      expect(components).toContain('.btn {');
      expect(components).toContain('height: 32px');
      expect(components).toContain('border-radius: var(--radius-control)');
      expect(components).toContain('&.btn-sm {');
      expect(components).toContain('height: 28px');
      expect(components).toContain('padding: 0 10px');
      expect(components).toContain('font-size: 12px');

      // Check focus-visible ring
      expect(components).toContain('&:focus-visible {');
      expect(components).toContain('box-shadow: 0 0 0 3px rgba($primary-color, 0.18)');

      // Ensure no hover translate motion
      expect(components).not.toContain('.btn:hover { transform');
      expect(components).not.toContain('transform: translateY');
    });

    test('preserves disabled and loading semantics and aria attributes', () => {
      const buttonSource = source('src/components/ui/Button.tsx');

      expect(buttonSource).toContain('disabled={disabled || loading}');
      expect(buttonSource).toContain('loading-spinner');
      expect(buttonSource).toContain('aria-hidden="true"');
    });
  });

  describe('Input and SearchInput components', () => {
    test('matches 32px height, radius-control, semantic borders, and no elevation shadows', () => {
      const components = source('src/styles/components.scss');

      expect(components).toContain('.input,');
      expect(components).toContain('height: 32px');
      expect(components).toContain('border-radius: var(--radius-control)');
      expect(components).toContain('background: var(--surface-panel)');
      expect(components).toContain('border: 1px solid var(--border-color)');
      expect(components).not.toContain('.input { box-shadow');
    });

    test('Input preserves full accessibility (label association, error, hint, aria-invalid, aria-describedby)', () => {
      const inputSource = source('src/components/ui/Input.tsx');

      expect(inputSource).toContain("aria-invalid={Boolean(error) || rest['aria-invalid']}");
      expect(inputSource).toContain('aria-describedby={describedBy}');
      expect(inputSource).toContain('htmlFor={inputId}');
    });

    test('SearchInput renders search icon, clear button with aria-label, and delegating to Input', () => {
      const searchSource = source('src/components/ui/SearchInput.tsx');

      expect(searchSource).toContain('<Input');
      expect(searchSource).toContain('aria-label="Clear"');
      expect(searchSource).toContain('IconSearch');
      expect(searchSource).toContain('IconX');
    });
  });

  describe('Select component', () => {
    test('uses custom portal dropdown with subtle radius-panel, floating shadow and no trigger elevation', () => {
      const selectStyles = source('src/components/ui/Select.module.scss');

      expect(selectStyles).toContain('.trigger {');
      expect(selectStyles).toContain('height: 32px');
      expect(selectStyles).toContain('border-radius: var(--radius-control)');
      expect(selectStyles).toContain('background-color: var(--surface-panel)');
      expect(selectStyles).toContain('.triggerSm {');
      expect(selectStyles).toContain('height: 28px');

      // Dropdown floating surface exception
      expect(selectStyles).toContain('.dropdown {');
      expect(selectStyles).toContain('background: var(--surface-floating)');
      expect(selectStyles).toContain('border-radius: var(--radius-panel)');
      expect(selectStyles).toContain('box-shadow: var(--floating-shadow)');

      // Options styling
      expect(selectStyles).toContain('.option {');
      expect(selectStyles).toContain('border-radius: var(--radius-control)');
    });

    test('preserves combobox accessibility semantics and keyboard navigation', () => {
      const selectSource = source('src/components/ui/Select.tsx');

      expect(selectSource).toContain('role="combobox"');
      expect(selectSource).toContain('role="listbox"');
      expect(selectSource).toContain('role="option"');
      expect(selectSource).toContain('aria-expanded={isOpen}');
      expect(selectSource).toContain('aria-activedescendant=');
    });
  });

  describe('ToggleSwitch component', () => {
    test('uses semantic primary/success color for enabled state and clear focus ring without jumping', () => {
      const toggleStyles = source('src/components/ui/ToggleSwitch.module.scss');

      expect(toggleStyles).toContain('.track {');
      expect(toggleStyles).toContain('border-radius: $radius-full');
      expect(toggleStyles).toContain('.thumb {');
      expect(toggleStyles).toContain('border-radius: $radius-full');

      // Enabled state: uses semantic active color
      expect(toggleStyles).toContain('.root input:checked + .track {');
      expect(toggleStyles).toContain('background: var(--primary-color)');

      // Focus-visible ring
      expect(toggleStyles).toContain('.root input:focus-visible + .track {');
      expect(toggleStyles).toContain('box-shadow: 0 0 0 3px rgba($primary-color, 0.18)');

      // Disabled state
      expect(toggleStyles).toContain('.disabled {');
      expect(toggleStyles).toContain('cursor: not-allowed');
      expect(toggleStyles).toContain('opacity: 0.6');
    });

    test('preserves checkbox accessibility, aria-label, and left/right label positioning', () => {
      const toggleSource = source('src/components/ui/ToggleSwitch.tsx');

      expect(toggleSource).toContain('type="checkbox"');
      expect(toggleSource).toContain('aria-label={ariaLabel}');
      expect(toggleSource).toContain('disabled={disabled}');
      expect(toggleSource).toContain('labelPosition');
    });
  });

  describe('Table component', () => {
    test('standardizes table wrapper, muted header, subtle borders, panel surface, and hover row without translation', () => {
      const tableStyles = source('src/components/ui/Table/Table.module.scss');

      expect(tableStyles).toContain('.wrap {');
      expect(tableStyles).toContain('border: 1px solid var(--border-subtle)');
      expect(tableStyles).toContain('border-radius: var(--radius-panel)');
      expect(tableStyles).toContain('background: var(--surface-panel)');

      expect(tableStyles).toContain('.head {');
      expect(tableStyles).toContain('background: var(--surface-muted)');

      expect(tableStyles).toContain('.row {');
      expect(tableStyles).toContain('transition: background-color var(--motion-hover)');
      expect(tableStyles).not.toContain('transform:');
      expect(tableStyles).toContain('border-bottom: 1px solid var(--border-subtle)');
    });

    test('preserves Table children, cols, className, alignRight on head/cell and row selection', () => {
      const tableSource = source('src/components/ui/Table/Table.tsx');

      expect(tableSource).toContain('export function Table(');
      expect(tableSource).toContain('export function TableHeader(');
      expect(tableSource).toContain('export function TableBody(');
      expect(tableSource).toContain('export function TableRow(');
      expect(tableSource).toContain('export function TableHead(');
      expect(tableSource).toContain('export function TableCell(');
      expect(tableSource).toContain('colgroup');
      expect(tableSource).toContain('alignRight');
      expect(tableSource).toContain('selected');
    });
  });
});
