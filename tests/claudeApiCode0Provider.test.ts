import { afterEach, describe, expect, test } from 'bun:test';
import { PROVIDER_BRAND_ORDER, PROVIDER_DESCRIPTORS } from '../src/features/providers/descriptors';
import { claudeApiToResource, code0ToResource } from '../src/features/providers/adapters';
import {
  CLAUDE_API_BASE_URL,
  CLAUDE_API_LEGACY_BASE_URL,
  isClaudeApiProvider,
} from '../src/features/providers/claudeApi';
import {
  CODE0_BASE_URL,
  CODE0_OPENAI_BASE_URL,
  buildCode0Raw,
  getCode0ProtocolUrls,
} from '../src/features/providers/code0';
import { apiClient } from '../src/services/api/client';
import { providersApi } from '../src/services/api/providers';

const originalGet = apiClient.get;
const originalPut = apiClient.put;
const originalDelete = apiClient.delete;

afterEach(() => {
  apiClient.get = originalGet;
  apiClient.put = originalPut;
  apiClient.delete = originalDelete;
});

describe('ClaudeAPI and Code0 providers', () => {
  test('appear in descriptors and provider order', () => {
    expect(PROVIDER_DESCRIPTORS.claudeApi.id).toBe('claudeApi');
    expect(PROVIDER_DESCRIPTORS.code0.id).toBe('code0');
    expect(PROVIDER_BRAND_ORDER).toContain('claudeApi');
    expect(PROVIDER_BRAND_ORDER).toContain('code0');
  });

  test('ClaudeAPI uses the current endpoint while recognizing current and legacy configs', () => {
    expect(CLAUDE_API_BASE_URL).toBe('https://gw.apito.ai');
    expect(CLAUDE_API_LEGACY_BASE_URL).toBe('https://gw.claudeapi.com');
    expect(isClaudeApiProvider({ baseUrl: `${CLAUDE_API_BASE_URL}/` })).toBeTrue();
    expect(isClaudeApiProvider({ baseUrl: `${CLAUDE_API_LEGACY_BASE_URL}/` })).toBeTrue();
    expect(isClaudeApiProvider({ baseUrl: 'https://example.com' })).toBeFalse();

    const config = { apiKey: 'claude-key', baseUrl: `${CLAUDE_API_BASE_URL}/` };
    expect(claudeApiToResource(config, 3)).toMatchObject({
      brand: 'claudeApi',
      name: 'ClaudeAPI',
      selector: {
        brand: 'claudeApi',
        apiKey: 'claude-key',
        baseUrl: `${CLAUDE_API_BASE_URL}/`,
        index: 3,
      },
    });
  });

  test('Code0 aggregates all supported backend protocol configs into one selector', () => {
    const urls = getCode0ProtocolUrls(CODE0_BASE_URL);
    const raw = buildCode0Raw({
      openaiCompatibility: [
        {
          name: 'code0',
          baseUrl: CODE0_OPENAI_BASE_URL,
          apiKeyEntries: [{ apiKey: 'openai-key' }],
        },
      ],
      claudeApiKeys: [{ apiKey: 'claude-key', baseUrl: urls.anthropic }],
      codexApiKeys: [{ apiKey: 'codex-key', baseUrl: urls.codex }],
      geminiApiKeys: [{ apiKey: 'gemini-key', baseUrl: urls.gemini }],
    });

    expect(code0ToResource(raw)).toMatchObject({
      brand: 'code0',
      name: 'Code0',
      selector: {
        brand: 'code0',
        openaiIndices: [0],
        claudeIndices: [0],
        codexIndices: [0],
        geminiIndices: [0],
      },
      flags: { protocols: ['openai', 'anthropic', 'gemini', 'codexResponses'] },
    });
  });

  test('CRUD reuses the existing protocol backend endpoints', async () => {
    const calls: Array<{ method: string; url: string; body?: unknown }> = [];
    apiClient.get = (async (url: string) => {
      calls.push({ method: 'GET', url });
      return {
        'claude-api-key': [],
        'codex-api-key': [],
        'gemini-api-key': [],
        'openai-compatibility': [],
      };
    }) as typeof apiClient.get;
    apiClient.put = (async (url: string, body?: unknown) => {
      calls.push({ method: 'PUT', url, body });
      return {};
    }) as typeof apiClient.put;
    apiClient.delete = (async (url: string) => {
      calls.push({ method: 'DELETE', url });
      return {};
    }) as typeof apiClient.delete;

    await providersApi.saveClaudeConfigs([{ apiKey: 'claude-key', baseUrl: CLAUDE_API_BASE_URL }]);
    await providersApi.saveCodexConfigs([{ apiKey: 'codex-key', baseUrl: CODE0_OPENAI_BASE_URL }]);
    await providersApi.saveGeminiKeys([{ apiKey: 'gemini-key', baseUrl: CODE0_BASE_URL }]);
    await providersApi.saveOpenAIProviders([
      {
        name: 'code0',
        baseUrl: CODE0_OPENAI_BASE_URL,
        apiKeyEntries: [{ apiKey: 'openai-key' }],
      },
    ]);
    await providersApi.deleteClaudeConfig('claude-key', CLAUDE_API_BASE_URL);
    await providersApi.deleteCodexConfig('codex-key', CODE0_OPENAI_BASE_URL);
    await providersApi.deleteGeminiKey('gemini-key', CODE0_BASE_URL);
    await providersApi.deleteOpenAIProvider('code0');

    expect(calls.filter((call) => call.method === 'PUT').map((call) => call.url)).toEqual([
      '/claude-api-key',
      '/codex-api-key',
      '/gemini-api-key',
      '/openai-compatibility',
    ]);
    expect(calls.filter((call) => call.method === 'DELETE').map((call) => call.url)).toEqual([
      '/claude-api-key?api-key=claude-key&base-url=https%3A%2F%2Fgw.apito.ai',
      '/codex-api-key?api-key=codex-key&base-url=https%3A%2F%2Fcode0.ai%2Fv1',
      '/gemini-api-key?api-key=gemini-key&base-url=https%3A%2F%2Fcode0.ai',
      '/openai-compatibility?name=code0',
    ]);
  });
});
