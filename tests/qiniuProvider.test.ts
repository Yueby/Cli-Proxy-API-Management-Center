import { describe, expect, test } from 'bun:test';
import { qiniuCloudToResource } from '../src/features/providers/adapters';
import { PROVIDER_DESCRIPTORS } from '../src/features/providers/descriptors';
import {
  buildQiniuCloudRaw,
  QINIU_CLOUD_DOMESTIC_BASE_URL,
  QINIU_CLOUD_OVERSEAS_BASE_URL,
} from '../src/features/providers/qiniuCloud';
import {
  applyMultiProtocolProviderMutation,
  removeMultiProtocolProviderConfigs,
} from '../src/features/providers/multiProtocolMutations';
import { getMultiProtocolProviderDefinition } from '../src/features/providers/multiProtocolDefinitions';

const input = {
  apiKey: '',
  name: '',
  baseUrl: '',
  proxyUrl: '',
  prefix: '',
  disabled: false,
  models: [],
  headers: [],
  excludedModelsText: '',
  multiProtocolKeyEntries: [
    {
      protocol: 'openai' as const,
      apiKey: 'openai-key',
      baseUrl: QINIU_CLOUD_DOMESTIC_BASE_URL,
      proxyUrl: '',
      prefix: '',
      disabled: false,
      models: [{ name: 'gpt-test' }],
    },
    {
      protocol: 'claude' as const,
      apiKey: 'claude-key',
      baseUrl: QINIU_CLOUD_OVERSEAS_BASE_URL,
      proxyUrl: '',
      prefix: '',
      disabled: false,
      models: [{ name: 'claude-test' }],
    },
  ],
};

describe('Qiniu Cloud provider behavior', () => {
  test('has a normal provider descriptor and four protocol definition', () => {
    expect(PROVIDER_DESCRIPTORS.qiniuCloud.id).toBe('qiniuCloud');
    expect(getMultiProtocolProviderDefinition('qiniuCloud').protocols).toEqual([
      'openai',
      'claude',
      'gemini',
      'codex',
    ]);
  });

  test('aggregates matching configs into one provider resource', () => {
    const raw = buildQiniuCloudRaw({
      openaiCompatibility: [
        {
          name: 'custom-qiniu',
          baseUrl: `${QINIU_CLOUD_DOMESTIC_BASE_URL}/v1`,
          apiKeyEntries: [{ apiKey: 'openai-key' }],
        },
      ],
      claudeApiKeys: [{ apiKey: 'claude-key', baseUrl: QINIU_CLOUD_OVERSEAS_BASE_URL }],
      codexApiKeys: [{ apiKey: 'codex-key', baseUrl: `${QINIU_CLOUD_DOMESTIC_BASE_URL}/v1` }],
      geminiApiKeys: [{ apiKey: 'gemini-key', baseUrl: QINIU_CLOUD_OVERSEAS_BASE_URL }],
    });
    const resource = qiniuCloudToResource(raw);

    expect(resource?.brand).toBe('qiniuCloud');
    expect(resource?.flags.protocols).toEqual(['openai', 'anthropic', 'gemini', 'codexResponses']);
    expect(resource?.apiKeyEntryCount).toBe(4);
    expect(resource?.selector).toEqual({
      brand: 'qiniuCloud',
      openaiIndices: [0],
      claudeIndices: [0],
      codexIndices: [0],
      geminiIndices: [0],
    });
  });

  test('creates, updates, and removes protocol configs without touching unrelated entries', () => {
    const initial = {
      openaiCompatibility: [
        {
          name: 'unrelated',
          baseUrl: 'https://example.com/v1',
          apiKeyEntries: [{ apiKey: 'keep' }],
        },
      ],
      claudeApiKeys: [],
      codexApiKeys: [],
      geminiApiKeys: [],
    };
    const created = applyMultiProtocolProviderMutation('qiniuCloud', initial, input);
    expect(created.openaiCompatibility).toHaveLength(2);
    expect(created.claudeApiKeys).toHaveLength(1);

    const raw = buildQiniuCloudRaw(created);
    const updated = applyMultiProtocolProviderMutation('qiniuCloud', created, {
      ...input,
      multiProtocolKeyEntries: input.multiProtocolKeyEntries.map((entry) => ({
        ...entry,
        apiKey: '',
        existingApiKey: `${entry.protocol}-key`,
        prefix: 'updated',
      })),
    });
    expect(buildQiniuCloudRaw(updated).openai[0]?.config.prefix).toBe('updated');
    expect(buildQiniuCloudRaw(updated).claude[0]?.config.prefix).toBe('updated');

    const removed = removeMultiProtocolProviderConfigs(updated, raw);
    expect(removed.openaiCompatibility).toEqual(initial.openaiCompatibility);
    expect(removed.claudeApiKeys).toEqual([]);
  });
});
