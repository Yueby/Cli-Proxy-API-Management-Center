import { afterEach, describe, expect, test } from 'bun:test';
import {
  buildInteractionsEndpoint,
  buildInteractionsProbePayload,
  getProviderUsageKey,
  INTERACTIONS_API_REVISION,
} from '../src/components/providers/utils';
import { interactionsToResource } from '../src/features/providers/adapters';
import { PROVIDER_BRAND_ORDER, PROVIDER_DESCRIPTORS } from '../src/features/providers/descriptors';
import { MODEL_DISCOVERY_BRANDS } from '../src/features/providers/sheets/forms/useModelDiscovery';
import en from '../src/i18n/locales/en.json';
import ru from '../src/i18n/locales/ru.json';
import zhCN from '../src/i18n/locales/zh-CN.json';
import zhTW from '../src/i18n/locales/zh-TW.json';
import { apiClient } from '../src/services/api/client';
import { providersApi } from '../src/services/api/providers';
import { normalizeConfigResponse } from '../src/services/api/transformers';

const originalGet = apiClient.get;
const originalPut = apiClient.put;
const originalDelete = apiClient.delete;

afterEach(() => {
  apiClient.get = originalGet;
  apiClient.put = originalPut;
  apiClient.delete = originalDelete;
});

describe('Interactions API provider contract', () => {
  test('normalizes config and exposes a regular workbench resource without reordering existing providers', () => {
    const config = normalizeConfigResponse({
      'interactions-api-key': [{
        'api-key': 'interactions-secret', priority: 8, weight: 3, prefix: 'native',
        'base-url': 'https://generativelanguage.googleapis.com', 'proxy-url': 'direct',
        headers: { 'X-Custom': 'value' },
        models: [{ name: 'gemini-3.1-flash-lite', alias: 'native-flash' }],
        'excluded-models': ['gemini-2.5-*'], 'disable-cooling': true,
        'auth-index': 'gemini-interactions:apikey:masked',
      }],
    });

    expect(config.interactionsApiKeys).toEqual([{
      apiKey: 'interactions-secret', priority: 8, weight: 3, prefix: 'native',
      baseUrl: 'https://generativelanguage.googleapis.com', proxyUrl: 'direct',
      headers: { 'X-Custom': 'value' },
      models: [{ name: 'gemini-3.1-flash-lite', alias: 'native-flash' }],
      excludedModels: ['gemini-2.5-*'], disableCooling: true,
      authIndex: 'gemini-interactions:apikey:masked',
    }]);

    const resource = interactionsToResource(config.interactionsApiKeys![0], 0);
    expect(resource.brand).toBe('interactions');
    expect(resource.models).toEqual(['gemini-3.1-flash-lite']);
    expect(resource.selector).toEqual({
      brand: 'interactions', apiKey: 'interactions-secret',
      baseUrl: 'https://generativelanguage.googleapis.com', index: 0,
    });
    expect(PROVIDER_DESCRIPTORS.interactions.baseUrlRequired).toBe(false);
    expect(PROVIDER_DESCRIPTORS.interactions.supportsTestModel).toBe(true);
    expect(PROVIDER_BRAND_ORDER.slice(0, -3)).toEqual([
      'gemini', 'codex', 'claude', 'vertex', 'openaiCompatibility',
      'xai', 'kimi', 'claudeApi', 'code0', 'fennoAI', 'qiniuCloud',
    ]);
    expect(PROVIDER_BRAND_ORDER.at(-3)).toBe('lmuAI');
    expect(PROVIDER_BRAND_ORDER.at(-2)).toBe('infistar');
    expect(PROVIDER_BRAND_ORDER.at(-1)).toBe('interactions');
    expect(MODEL_DISCOVERY_BRANDS).toContain('interactions');
  });

  test('builds the native endpoint and documented non-streaming probe contract', () => {
    expect(buildInteractionsEndpoint('')).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
    expect(buildInteractionsEndpoint('https://generativelanguage.googleapis.com')).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
    expect(buildInteractionsEndpoint('https://example.com/v1beta')).toBe('https://example.com/v1beta/interactions');
    expect(buildInteractionsEndpoint('https://example.com/v1beta/interactions')).toBe('https://example.com/v1beta/interactions');
    expect(INTERACTIONS_API_REVISION).toBe('2026-05-20');
    expect(buildInteractionsProbePayload('gemini-3.6-flash')).toEqual({ model: 'gemini-3.6-flash', input: 'Hi' });
  });

  test('maps workbench usage to the backend runtime provider', () => {
    expect(getProviderUsageKey('interactions')).toBe('gemini-interactions');
    expect(getProviderUsageKey('gemini')).toBe('gemini');
    expect(getProviderUsageKey('claudeApi')).toBe('claude');
  });

  test('creates, updates and deletes through the interactions config endpoints while preserving unknown fields', async () => {
    const calls: Array<{ method: string; url: string; data?: unknown }> = [];
    apiClient.get = (async (url: string) => {
      calls.push({ method: 'GET', url });
      return { 'interactions-api-key': [
        { 'api-key': 'shared-key', 'base-url': 'https://first.example.com', 'future-field': 'first' },
        { 'api-key': 'shared-key', 'base-url': 'https://second.example.com', 'proxy-url': 'direct',
          headers: { 'X-Old': 'value' }, 'excluded-models': ['old-model'], 'disable-cooling': true,
          'future-field': 'preserved', 'auth-index': 'response-only' },
      ] };
    }) as typeof apiClient.get;
    apiClient.put = (async (url: string, data?: unknown) => {
      calls.push({ method: 'PUT', url, data });
      return undefined;
    }) as typeof apiClient.put;
    apiClient.delete = (async (url: string) => {
      calls.push({ method: 'DELETE', url });
      return undefined;
    }) as typeof apiClient.delete;

    await providersApi.createInteractionsKey({ apiKey: 'interactions-new', baseUrl: 'https://new.example.com' });
    await providersApi.updateInteractionsKey('shared-key', 'https://second.example.com', {
      apiKey: 'shared-key', baseUrl: 'https://updated.example.com',
      models: [{ name: 'gemini-3.1-flash-lite', alias: 'native-flash' }],
    });
    await providersApi.deleteInteractionsKey('interactions-new', 'https://new.example.com');

    expect(calls[1]).toEqual({ method: 'PUT', url: '/interactions-api-key', data: [
      { 'api-key': 'shared-key', 'base-url': 'https://first.example.com', 'future-field': 'first' },
      { 'api-key': 'shared-key', 'base-url': 'https://second.example.com', 'proxy-url': 'direct',
        headers: { 'X-Old': 'value' }, 'excluded-models': ['old-model'], 'disable-cooling': true,
        'future-field': 'preserved', 'auth-index': 'response-only' },
      { 'api-key': 'interactions-new', 'base-url': 'https://new.example.com' },
    ] });
    expect(calls[3]).toEqual({ method: 'PUT', url: '/interactions-api-key', data: [
      { 'api-key': 'shared-key', 'base-url': 'https://first.example.com', 'future-field': 'first' },
      { 'future-field': 'preserved', 'api-key': 'shared-key', 'base-url': 'https://updated.example.com',
        models: [{ name: 'gemini-3.1-flash-lite', alias: 'native-flash' }] },
    ] });
    expect(calls[4]).toEqual({ method: 'DELETE', url: '/interactions-api-key?api-key=interactions-new&base-url=https%3A%2F%2Fnew.example.com' });
  });

  test('defines a non-empty provider name in all four shipped locales', () => {
    for (const locale of [en, ru, zhCN, zhTW]) {
      const value = locale.providersPage.providerNames.interactions;
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });
});


describe('Interactions connectivity wiring', () => {
  test('adds the API revision header and native probe payload in the connectivity hook', async () => {
    const source = await Bun.file(new URL('../src/features/providers/sheets/forms/useConnectivityTest.ts', import.meta.url)).text();
    expect(source).toContain("brand !== 'gemini' && brand !== 'interactions'");
    expect(source).toContain("headerObj['Api-Revision'] = INTERACTIONS_API_REVISION");
    expect(source).toContain('buildInteractionsProbePayload(model)');
  });
});


describe('Interactions workbench mutation wiring', () => {
  test('supports create, update, delete and disable through the regular provider workbench', async () => {
    const source = await Bun.file(new URL('../src/features/providers/useProviderWorkbench.ts', import.meta.url)).text();
    expect(source).toContain("brand === 'interactions'");
    expect(source).toContain('createInteractionsKey');
    expect(source).toContain('updateInteractionsKey');
    expect(source).toContain('deleteInteractionsKey');
    expect(source).toContain("updateConfigValue('interactions-api-key'");
  });
});


describe('Interactions policy boundary', () => {
  test('does not add a promotion or restore a deleted standalone page', async () => {
    const changedPaths = Bun.spawnSync(['git', 'diff', '--name-only', '33987fa']).stdout.toString();
    expect(changedPaths).not.toMatch(/sponsor|promotion|advert/i);
    expect(changedPaths).not.toMatch(/Interactions.*Page|pages\/.*interactions/i);
  });
});


describe('Interactions dashboard mapping', () => {
  test('counts interactions keys and labels runtime usage', async () => {
    const dashboardUtils = await import('../src/utils/dashboard');
    const counts = dashboardUtils.getProviderKeyCounts({
      geminiApiKeys: [{ apiKey: 'one' }],
      interactionsApiKeys: [{ apiKey: 'two' }, { apiKey: 'three' }],
    });
    expect(counts.interactions).toBe(2);
    expect(dashboardUtils.providerLabel('gemini-interactions', 'Unattributed')).toBe('Interactions API');
    const dashboardPage = await Bun.file(new URL('../src/pages/DashboardPage.tsx', import.meta.url)).text();
    expect(dashboardPage).toContain('providersApi.getInteractionsKeys()');
    expect(dashboardPage).toContain("path: '/ai-providers'");
  });
});
