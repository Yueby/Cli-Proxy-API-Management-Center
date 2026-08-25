import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateSecureApiKey } from '../src/utils/apiKey';
import { evaluateApiKeyStrength } from '../src/utils/apiKeyStrength';

describe('API key generation', () => {
  test('generates a 51-character key with the expected prefix and charset', () => {
    const apiKey = generateSecureApiKey();

    expect(apiKey).toHaveLength(51);
    expect(apiKey).toMatch(/^sk-[A-Za-z0-9]{48}$/);
  });

  test('generates distinct keys', () => {
    const apiKeys = Array.from({ length: 100 }, () => generateSecureApiKey());

    expect(new Set(apiKeys).size).toBe(apiKeys.length);
  });

  test('rejects out-of-range and weak random candidates', () => {
    const originalCrypto = globalThis.crypto;
    const batches = [
      Uint8Array.from(Array(64).fill(255)),
      Uint8Array.from(Array(64).fill(0)),
      Uint8Array.from({ length: 64 }, (_, index) => index),
    ];
    let calls = 0;

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues<T extends ArrayBufferView>(array: T): T {
          const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
          bytes.set(batches[Math.min(calls, batches.length - 1)].subarray(0, bytes.length));
          calls += 1;
          return array;
        },
      },
    });

    try {
      const generated = generateSecureApiKey();
      expect(generated).not.toBe(`sk-${'A'.repeat(48)}`);
      expect(evaluateApiKeyStrength(generated).tier).toBe('strong');
      expect(calls).toBeGreaterThanOrEqual(3);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
    }
  });

  test('rejects a periodic random body even when the prefix masks the pattern', () => {
    const originalCrypto = globalThis.crypto;
    let calls = 0;

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues<T extends ArrayBufferView>(array: T): T {
          const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
          for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = calls === 0 ? 26 + (index % 5) : index % 62;
          }
          calls += 1;
          return array;
        },
      },
    });

    try {
      const generated = generateSecureApiKey();
      expect(generated).not.toBe(`sk-${'abcde'.repeat(9)}abc`);
      expect(evaluateApiKeyStrength(generated).tier).toBe('strong');
      expect(calls).toBeGreaterThanOrEqual(2);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
    }
  });

  test('terminates deterministically and throws when crypto source persistently generates weak candidates', () => {
    const originalCrypto = globalThis.crypto;
    let calls = 0;

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues<T extends ArrayBufferView>(array: T): T {
          const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
          // Always fill with the same character index (0 -> 'A') which yields 'AAAA...' (weak candidate)
          bytes.fill(0);
          calls += 1;
          return array;
        },
      },
    });

    try {
      expect(() => generateSecureApiKey()).toThrow(
        /Failed to generate a sufficiently strong API key after 32 attempts/
      );
      expect(calls).toBe(32);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
    }
  });

  test('terminates deterministically and throws when crypto source persistently generates out-of-range unbiased bytes (e.g. 255)', () => {
    const originalCrypto = globalThis.crypto;
    let calls = 0;

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues<T extends ArrayBufferView>(array: T): T {
          const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
          // 255 is >= MAX_UNBIASED_BYTE (248), rejected by rejection sampling
          bytes.fill(255);
          calls += 1;
          return array;
        },
      },
    });

    try {
      expect(() => generateSecureApiKey(1)).toThrow(
        /Failed to collect enough unbiased random bytes after 16 sampling rounds/
      );
      expect(calls).toBe(16);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
    }
  });

  test('is wired into the reachable visual config API key editor', () => {
    const blocks = readFileSync(
      resolve(import.meta.dir, '../src/components/config/VisualConfigEditorBlocks.tsx'),
      'utf8'
    );
    const editor = readFileSync(
      resolve(import.meta.dir, '../src/components/config/VisualConfigEditor.tsx'),
      'utf8'
    );
    const routes = readFileSync(resolve(import.meta.dir, '../src/router/MainRoutes.tsx'), 'utf8');

    expect(blocks).toContain("import { generateSecureApiKey } from '@/utils/apiKey'");
    expect(blocks).toContain('setInputValue(generateSecureApiKey())');
    expect(blocks).toContain(
      "setFormError(t('config_management.visual.api_keys.generate_failed'))"
    );
    expect(editor).toContain('<ApiKeysCardEditor');
    expect(routes).toContain('path: \'/api-keys\', element: <Navigate to="/config" replace />');
  });
});
