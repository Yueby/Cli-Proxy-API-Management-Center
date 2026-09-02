import { describe, expect, test } from 'bun:test';
import { getSidebarShortcutLabel, isSidebarToggleShortcut } from '../src/utils/sidebarShortcut';

describe('sidebar shortcut', () => {
  test('recognizes Ctrl+B and Meta+B outside text editing controls', () => {
    expect(isSidebarToggleShortcut({ key: 'b', ctrlKey: true, metaKey: false })).toBe(true);
    expect(isSidebarToggleShortcut({ key: 'B', ctrlKey: false, metaKey: true })).toBe(true);
  });

  test('ignores text editing controls and unmodified keys', () => {
    expect(isSidebarToggleShortcut({ key: 'b', ctrlKey: false, metaKey: false })).toBe(false);
    expect(
      isSidebarToggleShortcut({
        key: 'b',
        ctrlKey: true,
        metaKey: false,
        target: { tagName: 'INPUT', isContentEditable: false } as unknown as EventTarget,
      })
    ).toBe(false);
  });

  test('returns platform-specific labels', () => {
    expect(getSidebarShortcutLabel(true)).toBe('⌘B');
    expect(getSidebarShortcutLabel(false)).toBe('Ctrl+B');
  });
});