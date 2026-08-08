import { describe, expect, test } from 'bun:test';
import { infistarToResource } from '../src/features/providers/adapters';
import { PROVIDER_LOGOS } from '../src/features/providers/brandLogos';
import {
  PROVIDER_BRAND_ORDER,
  PROVIDER_DESCRIPTORS,
  PROVIDER_PATHS,
} from '../src/features/providers/descriptors';
import {
  INFISTAR_BASE_URL_OPTIONS,
  INFISTAR_DOMESTIC_BASE_URL,
  INFISTAR_DOMESTIC_ROOT_URL,
  INFISTAR_GLOBAL_BASE_URL,
  INFISTAR_GLOBAL_ROOT_URL,
  buildInfistarRaw,
  getInfistarProtocolUrls,
  resolveInfistarBaseUrl,
} from '../src/features/providers/infistar';
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
      baseUrl: INFISTAR_DOMESTIC_BASE_URL,
      proxyUrl: '',
      prefix: '',
      disabled: false,
      models: [{ name: 'gpt-test' }],
    },
    {
      protocol: 'claude' as const,
      apiKey: 'claude-key',
      baseUrl: INFISTAR_DOMESTIC_BASE_URL,
      proxyUrl: '',
      prefix: '',
      disabled: false,
      models: [{ name: 'claude-test' }],
    },
    {
      protocol: 'gemini' as const,
      apiKey: 'gemini-key',
      baseUrl: INFISTAR_DOMESTIC_BASE_URL,
      proxyUrl: '',
      prefix: '',
      disabled: false,
      models: [{ name: 'gemini-test' }],
    },
    {
      protocol: 'codex' as const,
      apiKey: 'codex-key',
      baseUrl: INFISTAR_DOMESTIC_BASE_URL,
      proxyUrl: '',
      prefix: '',
      disabled: false,
      models: [{ name: 'codex-test' }],
    },
  ],
};

describe('Infistar normal multi-protocol provider', () => {
  test('defines mainland China and global endpoints for four protocols', () => {
    expect(INFISTAR_BASE_URL_OPTIONS.map(({ id, baseUrl }) => ({ id, baseUrl }))).toEqual([
      { id: 'mainlandChina', baseUrl: 'https://coneverse.com/v1' },
      { id: 'global', baseUrl: 'https://infistar.ai/v1' },
    ]);
    expect(resolveInfistarBaseUrl(undefined)).toBe(INFISTAR_DOMESTIC_BASE_URL);
    expect(resolveInfistarBaseUrl(INFISTAR_GLOBAL_ROOT_URL)).toBe(INFISTAR_GLOBAL_BASE_URL);
    expect(getInfistarProtocolUrls(undefined)).toEqual({
      openai: INFISTAR_DOMESTIC_BASE_URL,
      codex: INFISTAR_DOMESTIC_BASE_URL,
      anthropic: INFISTAR_DOMESTIC_ROOT_URL,
      gemini: INFISTAR_DOMESTIC_ROOT_URL,
    });
    expect(getMultiProtocolProviderDefinition('infistar').protocols).toEqual([
      'openai',
      'claude',
      'gemini',
      'codex',
    ]);
  });

  test('aggregates official endpoints but leaves custom endpoints in generic groups', () => {
    const raw = buildInfistarRaw({
      openaiCompatibility: [
        {
          name: 'infistar',
          baseUrl: INFISTAR_DOMESTIC_BASE_URL,
          apiKeyEntries: [{ apiKey: 'openai-key' }],
        },
        {
          name: 'custom',
          baseUrl: 'https://gateway.example.com/v1',
          apiKeyEntries: [{ apiKey: 'custom-key' }],
        },
      ],
      claudeApiKeys: [{ apiKey: 'claude-key', baseUrl: INFISTAR_DOMESTIC_ROOT_URL }],
      codexApiKeys: [{ apiKey: 'codex-key', baseUrl: INFISTAR_DOMESTIC_BASE_URL }],
      geminiApiKeys: [{ apiKey: 'gemini-key', baseUrl: INFISTAR_DOMESTIC_ROOT_URL }],
    });
    const resource = infistarToResource(raw);

    expect(raw.openai.map((item) => item.index)).toEqual([0]);
    expect(resource?.brand).toBe('infistar');
    expect(resource?.name).toBe('无限星河');
    expect(resource?.flags.protocols).toEqual(['openai', 'anthropic', 'gemini', 'codexResponses']);
  });

  test('creates, toggles, and removes configs through shared multi-protocol mutations', () => {
    const initial = {
      openaiCompatibility: [
        {
          name: 'unrelated',
          baseUrl: 'https://example.com/v1',
          apiKeyEntries: [{ apiKey: 'unrelated-openai' }],
        },
      ],
      claudeApiKeys: [{ apiKey: 'unrelated-claude', baseUrl: 'https://example.com' }],
      codexApiKeys: [],
      geminiApiKeys: [],
    };
    const created = applyMultiProtocolProviderMutation('infistar', initial, input);
    const raw = buildInfistarRaw(created);

    expect(raw.openai).toHaveLength(1);
    expect(raw.claude).toHaveLength(1);
    expect(raw.codex).toHaveLength(1);
    expect(raw.gemini).toHaveLength(1);

    const disabled = toggleMultiProtocolProviderConfigs(created, raw, true);
    expect(buildInfistarRaw(disabled).openai[0]?.config.disabled).toBe(true);
    expect(buildInfistarRaw(disabled).claude[0]?.config.excludedModels).toContain('*');

    const removed = removeMultiProtocolProviderConfigs(created, raw);
    expect(removed.openaiCompatibility).toEqual(initial.openaiCompatibility);
    expect(removed.claudeApiKeys).toEqual(initial.claudeApiKeys);
  });

  test('is reachable through the fork workbench catalog and shared forms', async () => {
    expect(PROVIDER_BRAND_ORDER.indexOf('infistar')).toBeGreaterThan(
      PROVIDER_BRAND_ORDER.indexOf('lmuAI')
    );
    expect(PROVIDER_BRAND_ORDER.indexOf('infistar')).toBeLessThan(
      PROVIDER_BRAND_ORDER.indexOf('interactions')
    );
    expect(PROVIDER_DESCRIPTORS.infistar.id).toBe('infistar');
    expect(PROVIDER_PATHS.infistar).toBe('/ai-providers/infistar');
    expect(PROVIDER_LOGOS.infistar?.src).toContain('infistar.png');

    const sheetSource = await Bun.file(
      new URL('../src/features/providers/sheets/ProviderSheet.tsx', import.meta.url)
    ).text();
    const pageSource = await Bun.file(
      new URL('../src/features/providers/ProvidersWorkbenchPage.tsx', import.meta.url)
    ).text();
    const cardsSource = await Bun.file(
      new URL('../src/features/providers/components/ProviderResourceCards.tsx', import.meta.url)
    ).text();
    expect(sheetSource).toContain('isMultiProtocolProviderBrand(state.brand)');
    expect(pageSource).toContain('infistar: infistarLogo');
    expect(pageSource).toMatch(/'lmuAI',\s*'infistar',\s*'interactions'/);
    expect(cardsSource).toContain('infistar: iconInfistar');
  });

  test('contains no affiliate, registration, sponsor, or recommendation hooks', async () => {
    const files = [
      '../src/features/providers/infistar.ts',
      '../src/features/providers/multiProtocolDefinitions.ts',
      '../src/features/providers/useProviderWorkbench.ts',
    ];
    const source = (
      await Promise.all(files.map((file) => Bun.file(new URL(file, import.meta.url)).text()))
    ).join('\n');
    expect(source).not.toMatch(/affiliate|register\?|ref_source|sponsor|推荐|recommended/i);
  });
});
