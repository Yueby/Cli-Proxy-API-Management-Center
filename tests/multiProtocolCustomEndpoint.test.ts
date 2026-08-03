import { describe, expect, test } from 'bun:test';
import { buildCode0Raw, CODE0_OPENAI_BASE_URL, CODE0_PROVIDER_NAME } from '../src/features/providers/code0';
import { buildQiniuCloudRaw, QINIU_CLOUD_BASE_URL_OPTIONS, QINIU_CLOUD_PROVIDER_NAME } from '../src/features/providers/qiniuCloud';
import { normalizeConfigResponse } from '../src/services/api/transformers';

const openAIConfig = (name: string, baseUrl: string) => ({
  openaiCompatibility: [{ name, baseUrl, apiKeyEntries: [{ apiKey: 'key' }] }],
});

describe('multi-protocol custom endpoint isolation', () => {
  test('keeps same-name custom endpoints in the generic OpenAI group', () => {
    const custom = 'https://gateway.example.com/v1';
    expect(buildCode0Raw(openAIConfig(CODE0_PROVIDER_NAME, custom)).openai).toEqual([]);
    expect(buildQiniuCloudRaw(openAIConfig(QINIU_CLOUD_PROVIDER_NAME, custom)).openai).toEqual([]);
  });

  test('still recognizes official endpoints regardless of display name', () => {
    expect(buildCode0Raw(openAIConfig('custom', CODE0_OPENAI_BASE_URL)).openai).toHaveLength(1);
    expect(buildQiniuCloudRaw(openAIConfig('custom', QINIU_CLOUD_BASE_URL_OPTIONS[0].openaiBaseUrl)).openai).toHaveLength(1);
  });

  test('preserves backend source indexes after normalization filters invalid entries', () => {
    const config = normalizeConfigResponse({
      'openai-compatibility': [
        { 'base-url': 'https://invalid.example.com/v1' },
        { name: CODE0_PROVIDER_NAME, 'base-url': CODE0_OPENAI_BASE_URL, 'api-key-entries': [{ 'api-key': 'official' }] },
        { name: 'custom', 'base-url': 'https://gateway.example.com/v1', 'api-key-entries': [{ 'api-key': 'custom' }] },
      ],
    });
    expect(config.openaiCompatibility?.map((item) => item.sourceIndex)).toEqual([1, 2]);
    expect(buildCode0Raw(config).openai.map((item) => item.index)).toEqual([1]);
  });
});
