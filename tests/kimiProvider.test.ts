import { afterEach, describe, expect, test } from 'bun:test';
import { buildOpenAIChatCompletionsEndpoint } from '../src/components/providers/utils';
import {
  KIMI_ANTHROPIC_BASE_URL,
  KIMI_DOMESTIC_ANTHROPIC_BASE_URL,
  KIMI_DOMESTIC_BASE_URL,
  KIMI_DOMESTIC_OPENAI_BASE_URL,
  KIMI_LEGACY_OPENAI_BASE_URL,
  KIMI_OPENAI_BASE_URL,
  KIMI_PROTOCOL_LABELS,
  buildKimiRaw,
  getKimiProtocolUrls,
  isKimiClaudeProvider,
  isKimiCodexProvider,
  isKimiOpenAIProvider,
  resolveKimiBaseUrl,
} from '../src/features/providers/kimi';
import { PROVIDER_LOGOS } from '../src/features/providers/brandLogos';
import { PROVIDER_BRAND_ORDER } from '../src/features/providers/descriptors';
import { getSponsorProviderDefinition } from '../src/features/providers/sponsorDefinitions';
import { getMultiProtocolProviderDefinition } from '../src/features/providers/multiProtocolDefinitions';
import { applyMultiProtocolProviderMutation, removeMultiProtocolProviderConfigs, toggleMultiProtocolProviderConfigs } from '../src/features/providers/multiProtocolMutations';
import { kimiToResource } from '../src/features/providers/adapters';
import { apiCallApi } from '../src/services/api/apiCall';
import { modelsApi } from '../src/services/api/models';

const originalApiCallRequest = apiCallApi.request;

afterEach(() => {
  apiCallApi.request = originalApiCallRequest;
});

describe('Kimi provider', () => {
  test('defaults to the domestic OpenAI-compatible, Claude, and Codex protocol endpoints', () => {
    expect(getKimiProtocolUrls(undefined)).toEqual({
      openai: 'https://api.moonshot.cn/v1',
      anthropic: 'https://api.moonshot.cn/anthropic',
      codex: 'https://api.moonshot.cn/v1',
      gemini: '',
    });
    expect(getKimiProtocolUrls(KIMI_OPENAI_BASE_URL)).toEqual({
      openai: 'https://api.moonshot.ai/v1',
      anthropic: 'https://api.moonshot.ai/anthropic',
      codex: 'https://api.moonshot.ai/v1',
      gemini: '',
    });
    expect(buildOpenAIChatCompletionsEndpoint(KIMI_OPENAI_BASE_URL)).toBe(
      'https://api.moonshot.ai/v1/chat/completions'
    );
    expect(KIMI_PROTOCOL_LABELS).toEqual(['openai', 'anthropic', 'codexResponses']);
    expect(getSponsorProviderDefinition('kimi').protocols).toEqual(['openai', 'claude', 'codex']);
  });

  test('offers overseas and domestic URLs and maps the domestic protocol endpoints', () => {
    expect(
      getSponsorProviderDefinition('kimi').baseUrlOptions.map(({ id, baseUrl }) => ({
        id,
        baseUrl,
      }))
    ).toEqual([
      { id: 'domestic', baseUrl: KIMI_DOMESTIC_OPENAI_BASE_URL },
      { id: 'overseas', baseUrl: KIMI_OPENAI_BASE_URL },
    ]);
    expect(resolveKimiBaseUrl(undefined)).toBe(KIMI_DOMESTIC_OPENAI_BASE_URL);
    expect(resolveKimiBaseUrl(KIMI_DOMESTIC_BASE_URL)).toBe(KIMI_DOMESTIC_OPENAI_BASE_URL);
    expect(resolveKimiBaseUrl(KIMI_LEGACY_OPENAI_BASE_URL)).toBe(KIMI_OPENAI_BASE_URL);
    expect(resolveKimiBaseUrl(KIMI_DOMESTIC_ANTHROPIC_BASE_URL)).toBe(
      KIMI_DOMESTIC_OPENAI_BASE_URL
    );
    expect(getKimiProtocolUrls(KIMI_DOMESTIC_OPENAI_BASE_URL)).toEqual({
      openai: 'https://api.moonshot.cn/v1',
      anthropic: 'https://api.moonshot.cn/anthropic',
      codex: 'https://api.moonshot.cn/v1',
      gemini: '',
    });
  });

  test('discovers models through the versioned OpenAI endpoint', async () => {
    let requestedUrl = '';
    apiCallApi.request = (async (payload) => {
      requestedUrl = payload.url;
      return { statusCode: 200, header: {}, bodyText: '', body: { data: [] } };
    }) as typeof apiCallApi.request;

    await modelsApi.fetchModelsViaApiCall(KIMI_OPENAI_BASE_URL, 'test-key');

    expect(requestedUrl).toBe('https://api.moonshot.ai/v1/models');
  });

  test('uses the OAuth-style theme surface for its provider icon', () => {
    expect(PROVIDER_LOGOS.kimi.themeSurface).toBeTrue();
  });

  test('keeps Kimi after the original provider catalog entries', () => {
    expect(PROVIDER_BRAND_ORDER.indexOf('kimi')).toBeGreaterThan(
      PROVIDER_BRAND_ORDER.indexOf('openaiCompatibility')
    );
  });

  test('recognizes Kimi configs only by supported protocol endpoint', () => {
    expect(
      isKimiOpenAIProvider({
        name: 'Kimi',
        baseUrl: 'https://custom.example.com',
      })
    ).toBeFalse();
    expect(
      isKimiOpenAIProvider({
        name: 'moonshot',
        baseUrl: `${KIMI_OPENAI_BASE_URL}/`,
      })
    ).toBeTrue();
    expect(
      isKimiOpenAIProvider({
        name: 'legacy-moonshot',
        baseUrl: KIMI_LEGACY_OPENAI_BASE_URL,
      })
    ).toBeTrue();
    expect(
      isKimiOpenAIProvider({
        name: 'domestic-moonshot',
        baseUrl: KIMI_DOMESTIC_OPENAI_BASE_URL,
      })
    ).toBeTrue();
    expect(
      isKimiClaudeProvider({ apiKey: 'sk-test', baseUrl: KIMI_ANTHROPIC_BASE_URL })
    ).toBeTrue();
    expect(
      isKimiClaudeProvider({ apiKey: 'sk-test', baseUrl: KIMI_DOMESTIC_ANTHROPIC_BASE_URL })
    ).toBeTrue();
    expect(
      isKimiCodexProvider({ apiKey: 'sk-test', baseUrl: `${KIMI_OPENAI_BASE_URL}/` })
    ).toBeTrue();
    expect(
      isKimiCodexProvider({ apiKey: 'sk-test', baseUrl: KIMI_DOMESTIC_OPENAI_BASE_URL })
    ).toBeTrue();
    expect(
      isKimiCodexProvider({ apiKey: 'sk-test', baseUrl: 'https://api.openai.com/v1' })
    ).toBeFalse();
  });

  test('aggregates only the Kimi OpenAI-compatible, Claude, and Codex configs', () => {
    const raw = buildKimiRaw({
      openaiCompatibility: [
        { name: 'kimi', baseUrl: KIMI_OPENAI_BASE_URL },
        { name: 'other', baseUrl: 'https://example.com' },
      ],
      claudeApiKeys: [
        { apiKey: 'sk-test', baseUrl: KIMI_ANTHROPIC_BASE_URL },
        { apiKey: 'sk-test', baseUrl: 'https://api.anthropic.com' },
      ],
      codexApiKeys: [
        { apiKey: 'sk-test', baseUrl: KIMI_DOMESTIC_OPENAI_BASE_URL },
        { apiKey: 'sk-test', baseUrl: 'https://api.openai.com/v1' },
      ],
    });

    expect(raw.openai.map((item) => item.index)).toEqual([0]);
    expect(raw.claude.map((item) => item.index)).toEqual([0]);
    expect(raw.codex.map((item) => item.index)).toEqual([0]);
    expect(raw.gemini).toEqual([]);
  });

  test('exposes Kimi through the shared multi-protocol definition and aggregates one resource', () => {
    const definition = getMultiProtocolProviderDefinition('kimi');
    expect(definition.protocols).toEqual(['openai', 'claude', 'codex']);
    const resource = kimiToResource({
      openai: [{ config: { name: 'kimi', baseUrl: KIMI_OPENAI_BASE_URL }, index: 2 }],
      claude: [{ config: { apiKey: 'c', baseUrl: KIMI_ANTHROPIC_BASE_URL }, index: 4 }],
      codex: [{ config: { apiKey: 'x', baseUrl: KIMI_OPENAI_BASE_URL }, index: 5 }],
      gemini: [],
    });
    expect(resource?.brand).toBe('kimi');
    expect(resource?.flags.protocols).toEqual(['openai', 'anthropic', 'codexResponses']);
    expect(resource?.selector).toMatchObject({ openaiIndices: [2], claudeIndices: [4], codexIndices: [5] });
  });

  test('creates, updates, removes, and toggles Kimi configs through shared mutation seams', () => {
    const config = {
      openaiCompatibility: [{ name: 'other', baseUrl: 'https://other.example/v1' }, { name: 'kimi', baseUrl: KIMI_OPENAI_BASE_URL }],
      claudeApiKeys: [{ apiKey: 'other-c', baseUrl: 'https://other.example/anthropic' }, { apiKey: 'kimi-c', baseUrl: KIMI_ANTHROPIC_BASE_URL }],
      codexApiKeys: [{ apiKey: 'other-x', baseUrl: 'https://other.example/v1' }, { apiKey: 'kimi-x', baseUrl: KIMI_OPENAI_BASE_URL }],
    };
    const input = { apiKey: '', name: '', baseUrl: KIMI_OPENAI_BASE_URL, proxyUrl: '', prefix: '', disabled: false, models: [], headers: [], excludedModelsText: '', multiProtocolKeyEntries: [
      { protocol: 'openai' as const, apiKey: 'new-o', baseUrl: KIMI_OPENAI_BASE_URL, proxyUrl: '', prefix: '', disabled: false, models: [] },
      { protocol: 'claude' as const, apiKey: 'new-c', baseUrl: KIMI_OPENAI_BASE_URL, proxyUrl: '', prefix: '', disabled: false, models: [] },
      { protocol: 'codex' as const, apiKey: 'new-x', baseUrl: KIMI_OPENAI_BASE_URL, proxyUrl: '', prefix: '', disabled: false, models: [] },
    ] };
    const next = applyMultiProtocolProviderMutation('kimi', config, input);
    expect(next.openaiCompatibility.map((item) => item.name)).toEqual(['other', 'kimi']);
    expect(next.openaiCompatibility[1].apiKeyEntries?.[0].apiKey).toBe('new-o');
    expect(next.claudeApiKeys[1].baseUrl).toBe(KIMI_ANTHROPIC_BASE_URL);
    expect(next.codexApiKeys[1].baseUrl).toBe(KIMI_OPENAI_BASE_URL);
    const raw = buildKimiRaw(next);
    expect(removeMultiProtocolProviderConfigs(next, raw).openaiCompatibility).toEqual([config.openaiCompatibility[0]]);
    expect(toggleMultiProtocolProviderConfigs(next, raw, true).codexApiKeys[1].excludedModels).toEqual(['*']);
  });
});
