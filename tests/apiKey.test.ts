import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateSecureApiKey } from '../src/utils/apiKey';

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

  test('rejects out-of-range bytes instead of folding them into base62', () => {
    const originalCrypto = globalThis.crypto;
    const batches = [
      Uint8Array.from(Array(64).fill(255)),
      Uint8Array.from(Array(64).fill(0)),
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
      expect(generateSecureApiKey()).toBe(`sk-${'A'.repeat(48)}`);
      expect(calls).toBe(2);
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
    expect(editor).toContain('<ApiKeysCardEditor');
    expect(routes).toContain("path: '/api-keys', element: <Navigate to=\"/config\" replace />");
  });
});
