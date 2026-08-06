import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { copyToClipboard } from '../src/utils/clipboard';

const formsRoot = new URL('../src/features/providers/sheets/forms/', import.meta.url);
const readForm = (name: string) => readFileSync(new URL(name, formsRoot), 'utf8');

describe('provider API key copy controls', () => {
  test('prefers a newly entered key and otherwise copies the saved edit-mode key', async () => {
    const { resolveCopyableProviderKey } = await import(
      '../src/features/providers/sheets/forms/providerKeyClipboard'
    );

    expect(resolveCopyableProviderKey('  [REDACTED]-new  ', '[REDACTED]-saved')).toBe(
      '[REDACTED]-new'
    );
    expect(resolveCopyableProviderKey('', '  [REDACTED]-saved  ')).toBe('[REDACTED]-saved');
    expect(resolveCopyableProviderKey('   ', '   ')).toBe('');
  });

  test('single-key provider edit form copies the real saved key without rendering it in the input', () => {
    const source = readForm('BaseProviderForm.tsx');

    expect(source).toContain('copyToClipboard(copyableSingleApiKey)');
    expect(source).toContain("t('providersPage.form.copyApiKey')");
    expect(source).toContain('disabled={mutating || !copyableSingleApiKey}');
    expect(source).toContain("apiKey: ''");
    expect(source).toContain('value={form.apiKey}');
  });

  test('multi-entry and multi-protocol edit forms copy saved keys while keeping password fields masked', () => {
    const apiKeyEntries = readForm('ApiKeyEntriesEditor.tsx');
    const multiProtocol = readForm('MultiProtocolProviderForm.tsx');
    const code0 = readForm('Code0ProviderForm.tsx');

    expect(apiKeyEntries).toContain('resolveCopyableProviderKey(entry.apiKey, entry.existingApiKey)');
    expect(apiKeyEntries).toContain('copyToClipboard(copyableKey)');
    expect(apiKeyEntries).toContain("type={showPasswords.has(idx) ? 'text' : 'password'}");

    expect(multiProtocol).toContain('resolveCopyableProviderKey(entry.apiKey, entry.existingApiKey)');
    expect(multiProtocol).toContain('copyToClipboard(copyableKey)');
    expect(multiProtocol).toContain('type="password"');

    expect(code0).toContain('resolveCopyableProviderKey(entry.apiKey, entry.existingApiKey)');
    expect(code0).toContain('copyToClipboard(copyableKey)');
    expect(code0).toContain('type="password"');
  });

  test('falls back to the hidden textarea copy path when Clipboard API is unavailable', async () => {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    let appended = false;
    let removed = false;
    let selected = false;

    const textarea = {
      value: '',
      style: {} as CSSStyleDeclaration,
      setAttribute: () => undefined,
      focus: () => undefined,
      select: () => {
        selected = true;
      },
      setSelectionRange: () => undefined,
    } as unknown as HTMLTextAreaElement;
    const body = {
      appendChild: () => {
        appended = true;
        return textarea;
      },
      removeChild: () => {
        removed = true;
        return textarea;
      },
    } as unknown as HTMLElement;

    try {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {},
      });
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
          body,
          createElement: () => textarea,
          execCommand: (command: string) => command === 'copy',
        },
      });
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
          getSelection: () => ({ removeAllRanges: () => undefined }),
        },
      });

      expect(await copyToClipboard('[REDACTED]')).toBe(true);
      expect(textarea.value).toBe('[REDACTED]');
      expect(selected).toBe(true);
      expect(appended).toBe(true);
      expect(removed).toBe(true);
    } finally {
      if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
      else Reflect.deleteProperty(globalThis, 'navigator');
      if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
      else Reflect.deleteProperty(globalThis, 'document');
      if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });

  test('copy action reports success and failure without logging or displaying the key', () => {
    for (const name of [
      'BaseProviderForm.tsx',
      'ApiKeyEntriesEditor.tsx',
      'MultiProtocolProviderForm.tsx',
      'Code0ProviderForm.tsx',
    ]) {
      const source = readForm(name);
      expect(source).toContain("copied ? 'success' : 'error'");
      expect(source).toContain("'providersPage.form.apiKeyCopied'");
      expect(source).toContain("'notification.copy_failed'");
      expect(source).not.toMatch(/console\.(?:log|info|warn|error)\([^\n]*apiKey/);
    }
  });
});
