import { describe, expect, test } from 'bun:test';
import { getMultiProtocolAggregationConflict } from '../src/features/providers/multiProtocolAggregation';
import type { MultiProtocolProviderRaw } from '../src/features/providers/types';

const emptyRaw = (): MultiProtocolProviderRaw => ({
  openai: [],
  claude: [],
  codex: [],
  gemini: [],
});

describe('multi-protocol aggregation safety', () => {
  test('detects multiple configs for one protocol', () => {
    const raw = emptyRaw();
    raw.codex = [
      { index: 0, config: { apiKey: 'first' } },
      { index: 1, config: { apiKey: 'second' } },
    ];

    expect(getMultiProtocolAggregationConflict(raw)).toBe('multiple-configs');
  });

  test('detects multiple OpenAI API keys in one config', () => {
    const raw = emptyRaw();
    raw.openai = [
      {
        index: 0,
        config: {
          name: 'multi-protocol',
          baseUrl: 'https://example.com/v1',
          apiKeyEntries: [{ apiKey: 'first' }, { apiKey: 'second' }],
        },
      },
    ];

    expect(getMultiProtocolAggregationConflict(raw)).toBe('multiple-openai-keys');
  });

  test('allows the supported one-config-per-protocol shape', () => {
    const raw = emptyRaw();
    raw.claude = [{ index: 0, config: { apiKey: 'claude' } }];
    raw.openai = [
      {
        index: 0,
        config: {
          name: 'multi-protocol',
          baseUrl: 'https://example.com/v1',
          apiKeyEntries: [{ apiKey: 'openai' }],
        },
      },
    ];

    expect(getMultiProtocolAggregationConflict(raw)).toBeNull();
  });
});

describe('multi-protocol forms', () => {
  test('Code0 and shared multi-protocol forms block lossy edit aggregation', async () => {
    const code0Source = await Bun.file(
      new URL('../src/features/providers/sheets/forms/Code0ProviderForm.tsx', import.meta.url)
    ).text();
    const sharedSource = await Bun.file(
      new URL('../src/features/providers/sheets/forms/MultiProtocolProviderForm.tsx', import.meta.url)
    ).text();

    for (const source of [code0Source, sharedSource]) {
      expect(source).toContain('getMultiProtocolAggregationConflict');
      expect(source).toContain("mode === 'edit'");
      expect(source).toContain('aggregationConflict');
    }
  });
});
