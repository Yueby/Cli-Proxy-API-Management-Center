import { describe, expect, test } from 'bun:test';
import { lmuAIToResource } from '../src/features/providers/adapters';
import { PROVIDER_LOGOS } from '../src/features/providers/brandLogos';
import { PROVIDER_BRAND_ORDER, PROVIDER_DESCRIPTORS, PROVIDER_PATHS } from '../src/features/providers/descriptors';
import {
  LMU_AI_BASE_URL,
  LMU_AI_OPENAI_BASE_URL,
  buildLmuAIRaw,
  getLmuAIProtocolUrls,
} from '../src/features/providers/lmuAI';
import { getMultiProtocolProviderDefinition } from '../src/features/providers/multiProtocolDefinitions';
import {
  applyMultiProtocolProviderMutation,
  removeMultiProtocolProviderConfigs,
  toggleMultiProtocolProviderConfigs,
} from '../src/features/providers/multiProtocolMutations';

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
      baseUrl: LMU_AI_BASE_URL,
      proxyUrl: '',
      prefix: '',
      disabled: false,
      models: [{ name: 'gpt-test' }],
    },
    {
      protocol: 'claude' as const,
      apiKey: 'claude-key',
      baseUrl: LMU_AI_BASE_URL,
      proxyUrl: '',
      prefix: '',
      disabled: false,
      models: [{ name: 'claude-test' }],
    },
    {
      protocol: 'gemini' as const,
      apiKey: 'gemini-key',
      baseUrl: LMU_AI_BASE_URL,
      proxyUrl: '',
      prefix: '',
      disabled: false,
      models: [{ name: 'gemini-test' }],
    },
    {
      protocol: 'codex' as const,
      apiKey: 'codex-key',
      baseUrl: LMU_AI_BASE_URL,
      proxyUrl: '',
      prefix: '',
      disabled: false,
      models: [{ name: 'codex-test' }],
    },
  ],
};

describe('LMU AI normal multi-protocol provider', () => {
  test('defines the four official protocol endpoints without promotional metadata', () => {
    expect(getLmuAIProtocolUrls(undefined)).toEqual({
      openai: 'https://api.lmuai.com/v1',
      codex: 'https://api.lmuai.com/v1',
      anthropic: 'https://api.lmuai.com',
      gemini: 'https://api.lmuai.com',
    });
    expect(getMultiProtocolProviderDefinition('lmuAI').protocols).toEqual([
      'openai',
      'claude',
      'gemini',
      'codex',
    ]);
  });

  test('aggregates only official LMU AI endpoints into one resource', () => {
    const raw = buildLmuAIRaw({
      openaiCompatibility: [
        {
          name: 'custom-name',
          baseUrl: LMU_AI_OPENAI_BASE_URL,
          apiKeyEntries: [{ apiKey: 'openai-key' }],
          sourceIndex: 3,
        },
        {
          name: 'lmuAI',
          baseUrl: 'https://gateway.example.com/v1',
          apiKeyEntries: [{ apiKey: 'custom-key' }],
        },
      ],
      claudeApiKeys: [{ apiKey: 'claude-key', baseUrl: LMU_AI_BASE_URL }],
      codexApiKeys: [{ apiKey: 'codex-key', baseUrl: LMU_AI_OPENAI_BASE_URL }],
      geminiApiKeys: [{ apiKey: 'gemini-key', baseUrl: LMU_AI_BASE_URL }],
    });
    const resource = lmuAIToResource(raw);

    expect(raw.openai.map((item) => item.index)).toEqual([3]);
    expect(resource?.brand).toBe('lmuAI');
    expect(resource?.name).toBe('LMU AI（灵眸AI）');
    expect(resource?.flags.protocols).toEqual(['openai', 'anthropic', 'gemini', 'codexResponses']);
    expect(resource?.selector).toEqual({
      brand: 'lmuAI',
      openaiIndices: [3],
      claudeIndices: [0],
      codexIndices: [0],
      geminiIndices: [0],
    });
  });

  test('creates, updates, toggles, and removes configs without touching unrelated providers', () => {
    const initial = {
      openaiCompatibility: [
        {
          name: 'unrelated',
          baseUrl: 'https://example.com/v1',
          apiKeyEntries: [{ apiKey: 'keep-openai' }],
        },
      ],
      claudeApiKeys: [{ apiKey: 'keep-claude', baseUrl: 'https://example.com' }],
      codexApiKeys: [],
      geminiApiKeys: [],
    };
    const created = applyMultiProtocolProviderMutation('lmuAI', initial, input);
    const raw = buildLmuAIRaw(created);
    expect(raw.openai).toHaveLength(1);
    expect(raw.claude).toHaveLength(1);
    expect(raw.codex).toHaveLength(1);
    expect(raw.gemini).toHaveLength(1);

    const updated = applyMultiProtocolProviderMutation('lmuAI', created, {
      ...input,
      multiProtocolKeyEntries: input.multiProtocolKeyEntries.map((entry) => ({
        ...entry,
        apiKey: '',
        existingApiKey: `${entry.protocol}-key`,
        prefix: 'updated',
      })),
    });
    expect(buildLmuAIRaw(updated).openai[0]?.config.prefix).toBe('updated');
    expect(buildLmuAIRaw(updated).claude[0]?.config.prefix).toBe('updated');

    const disabled = toggleMultiProtocolProviderConfigs(updated, buildLmuAIRaw(updated), true);
    expect(buildLmuAIRaw(disabled).openai[0]?.config.disabled).toBe(true);
    expect(buildLmuAIRaw(disabled).claude[0]?.config.excludedModels).toContain('*');

    const removed = removeMultiProtocolProviderConfigs(updated, buildLmuAIRaw(updated));
    expect(removed.openaiCompatibility).toEqual(initial.openaiCompatibility);
    expect(removed.claudeApiKeys).toEqual(initial.claudeApiKeys);
    expect(removed.codexApiKeys).toEqual([]);
    expect(removed.geminiApiKeys).toEqual([]);
  });

  test('appends LMU AI after existing workbench providers with its normal descriptor, path, and logo', () => {
    expect(PROVIDER_BRAND_ORDER.indexOf('lmuAI')).toBeGreaterThan(PROVIDER_BRAND_ORDER.indexOf('qiniuCloud'));
    expect(PROVIDER_BRAND_ORDER.indexOf('lmuAI')).toBeLessThan(PROVIDER_BRAND_ORDER.indexOf('interactions'));
    expect(PROVIDER_DESCRIPTORS.lmuAI.id).toBe('lmuAI');
    expect(PROVIDER_PATHS.lmuAI).toBe('/ai-providers/lmuai');
    expect(PROVIDER_LOGOS.lmuAI?.src).toContain('lmu-ai.png');
  });
});


test('LMU AI implementation contains no promotion or registration hooks', async () => {
  const providerSource = await Bun.file(
    new URL('../src/features/providers/lmuAI.ts', import.meta.url)
  ).text();
  const workbenchSource = await Bun.file(
    new URL('../src/features/providers/useProviderWorkbench.ts', import.meta.url)
  ).text();
  const combined = `${providerSource}\n${workbenchSource}`;
  expect(combined).not.toMatch(/affiliate|register\?ref|sponsor|推荐|注册链接/i);
});

test('LMU AI is routed through the shared multi-protocol workbench surfaces', async () => {
  const sheetSource = await Bun.file(
    new URL('../src/features/providers/sheets/ProviderSheet.tsx', import.meta.url)
  ).text();
  const pageSource = await Bun.file(
    new URL('../src/features/providers/ProvidersWorkbenchPage.tsx', import.meta.url)
  ).text();
  const cardsSource = await Bun.file(
    new URL('../src/features/providers/components/ProviderResourceCards.tsx', import.meta.url)
  ).text();
  expect(sheetSource).toContain("isMultiProtocolProviderBrand(state.brand)");
  expect(pageSource).toContain("lmuAI: lmuAILogo");
  expect(pageSource).toMatch(/'qiniuCloud',\s*'lmuAI'/);
  expect(cardsSource).toContain("lmuAI: iconLmuAI");
});
