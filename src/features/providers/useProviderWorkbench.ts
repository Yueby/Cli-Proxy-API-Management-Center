import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { providersApi } from '@/services/api';
import { useAuthStore, useConfigStore } from '@/stores';
import {
  withDisableAllModelsRule,
  withoutDisableAllModelsRule,
} from '@/components/providers/utils';
import type {
  GeminiKeyConfig,
  OpenAIProviderConfig,
  ProviderKeyConfig,
} from '@/types';
import {
  claudeApiToResource,
  claudeToResource,
  code0ToResource,
  codexToResource,
  fennoAIToResource,
  geminiToResource,
  lmuAIToResource,
  interactionsToResource,
  openaiToResource,
  qiniuCloudToResource,
  vertexToResource,
  xaiToResource,
} from './adapters';
import { buildKimiRaw, KIMI_DISPLAY_NAME } from './kimi';
import { PROVIDER_BRAND_ORDER, PROVIDER_PATHS } from './descriptors';
import { CLAUDE_API_BASE_URL, isClaudeApiProvider } from './claudeApi';
import {
  CODE0_PROVIDER_NAME,
  buildCode0Raw,
  getCode0ProtocolUrls,
  isCode0ClaudeProvider,
  isCode0CodexProvider,
  isCode0GeminiProvider,
  isCode0OpenAIProvider,
} from './code0';
import { buildFennoAIRaw, isFennoAIClaudeProvider, isFennoAICodexProvider } from './fennoAI';
import { buildLmuAIRaw, isLmuAIClaudeProvider, isLmuAICodexProvider, isLmuAIGeminiProvider, isLmuAIOpenAIProvider } from './lmuAI';
import { buildQiniuCloudRaw, isQiniuCloudClaudeProvider, isQiniuCloudCodexProvider, isQiniuCloudGeminiProvider, isQiniuCloudOpenAIProvider } from './qiniuCloud';
import { applyMultiProtocolProviderMutation, removeMultiProtocolProviderConfigs, toggleMultiProtocolProviderConfigs, type MultiProtocolConfigLists } from './multiProtocolMutations';
import { isMultiProtocolProviderBrand } from './multiProtocolDefinitions';
import { runMultiProtocolMutationWithRecovery } from './multiProtocolMutationRecovery';
import type {
  ProviderBrand,
  ProviderEntryFormInput,
  ProviderGroup,
  ProviderResource,
  ProviderSnapshot,
  MultiProtocolProviderRaw,
} from './types';
import { getCode0KeyEntries, type Code0KeyEntryInput, type Code0ProviderRaw } from './code0Workbench';

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '';
};

export interface UseProviderWorkbenchResult {
  connected: boolean;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  errorMessage: string | null;
  snapshot: ProviderSnapshot | null;
  refetch: () => Promise<void>;

  createProvider: (brand: ProviderBrand, input: ProviderEntryFormInput) => Promise<void>;
  updateProvider: (resource: ProviderResource, input: ProviderEntryFormInput) => Promise<void>;
  deleteProvider: (resource: ProviderResource) => Promise<void>;
  toggleDisabled: (resource: ProviderResource, disabled: boolean) => Promise<void>;
  mutating: boolean;
  refreshSnapshot: () => void;
}

/* -------------------------------------------------------------------------- */
/* form -> backend config 转换                                                 */
/* -------------------------------------------------------------------------- */

const parseTextList = (text: string): string[] =>
  text
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const headersFromEntries = (
  entries: Array<{ key: string; value: string }>
): Record<string, string> => {
  const out: Record<string, string> = {};
  entries.forEach((entry) => {
    const key = entry.key.trim();
    if (!key) return;
    out[key] = entry.value;
  });
  return out;
};

const parseThinkingJson = (value: string | undefined): Record<string, unknown> | undefined => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return undefined;
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Thinking config must be a JSON object');
  }
  return parsed as Record<string, unknown>;
};

/**
 * `'*'` is the backend's provider-disabled rule. The disabled switch owns it;
 * the excluded-model editor must never create or retain it independently.
 */
export const buildExcludedModels = (
  textValue: string,
  disabled: boolean,
  brand: ProviderBrand
): string[] | undefined => {
  const list = parseTextList(textValue);
  const filtered = list.filter((v) => v !== '*');
  if (brand === 'openaiCompatibility') {
    return filtered.length ? filtered : undefined;
  }
  if (disabled) {
    return withDisableAllModelsRule(filtered);
  }
  return filtered.length ? filtered : undefined;
};

const buildProviderKeyConfig = (
  brand: 'gemini' | 'interactions' | 'codex' | 'xai' | 'claude' | 'vertex',
  input: ProviderEntryFormInput,
  existing?: ProviderKeyConfig | GeminiKeyConfig | null
): ProviderKeyConfig | GeminiKeyConfig => {
  const headers = headersFromEntries(input.headers);
  const models = input.models
    .map((m) => ({
      name: m.name.trim(),
      alias: m.alias?.trim() || undefined,
      priority: m.priority,
      testModel: m.testModel,
    }))
    .filter((m) => m.name);
  const excluded = buildExcludedModels(input.excludedModelsText, input.disabled, brand);
  const apiKeyChanged = input.apiKey.trim().length > 0;
  const next: ProviderKeyConfig = {
    apiKey: apiKeyChanged ? input.apiKey.trim() : (existing?.apiKey ?? ''),
    priority: input.priority,
    weight: existing?.weight,
    prefix: input.prefix.trim() || undefined,
    baseUrl: input.baseUrl.trim() || undefined,
    proxyUrl: input.proxyUrl.trim() || undefined,
    models: models.length ? models : undefined,
    headers: Object.keys(headers).length ? headers : undefined,
    excludedModels: excluded,
    disableCooling: input.disableCooling === true,
    authIndex: existing?.authIndex,
  };
  if ((brand === 'codex' || brand === 'xai') && input.websockets !== undefined) {
    next.websockets = input.websockets;
  }
  if (brand === 'claude' && input.cloak) {
    next.cloak = {
      mode: input.cloak.mode.trim() || undefined,
      strictMode: input.cloak.strictMode,
      sensitiveWords: parseTextList(input.cloak.sensitiveWordsText),
      cacheUserId: input.cloak.cacheUserId === true,
    };
  }
  if (brand === 'claude') {
    next.experimentalCchSigning = input.experimentalCchSigning === true;
  }
  return next;
};

const buildClaudeApiConfig = (
  input: ProviderEntryFormInput,
  existing?: ProviderKeyConfig | null
): ProviderKeyConfig =>
  buildProviderKeyConfig(
    'claude',
    { ...input, baseUrl: CLAUDE_API_BASE_URL },
    existing
  ) as ProviderKeyConfig;

const code0ApiKey = (entry: Code0KeyEntryInput): string =>
  entry.apiKey.trim() || entry.existingApiKey?.trim() || '';

const buildCode0ProviderKey = (
  entry: Code0KeyEntryInput,
  existing?: ProviderKeyConfig | GeminiKeyConfig
): ProviderKeyConfig => {
  const urls = getCode0ProtocolUrls(entry.baseUrl);
  const baseUrl =
    entry.protocol === 'codex'
      ? urls.codex
      : entry.protocol === 'claude'
        ? urls.anthropic
        : urls.gemini;
  return {
    ...(existing ?? {}),
    apiKey: code0ApiKey(entry),
    baseUrl,
    proxyUrl: entry.proxyUrl.trim() || undefined,
    prefix: entry.prefix.trim() || undefined,
    excludedModels: entry.disabled
      ? withDisableAllModelsRule(existing?.excludedModels)
      : withoutDisableAllModelsRule(existing?.excludedModels),
  };
};

const buildCode0OpenAI = (
  entry: Code0KeyEntryInput,
  existing?: OpenAIProviderConfig
): OpenAIProviderConfig => ({
  ...(existing ?? {}),
  name: CODE0_PROVIDER_NAME,
  baseUrl: getCode0ProtocolUrls(entry.baseUrl).openai,
  prefix: entry.prefix.trim() || undefined,
  disabled: entry.disabled,
  apiKeyEntries: [
    {
      ...(existing?.apiKeyEntries?.[0] ?? {}),
      apiKey: code0ApiKey(entry),
      proxyUrl: entry.proxyUrl.trim() || undefined,
    },
  ],
});

const buildOpenAIConfig = (
  input: ProviderEntryFormInput,
  existing?: OpenAIProviderConfig | null
): OpenAIProviderConfig => {
  const headers = headersFromEntries(input.headers);
  const models = input.models
    .map((m) => ({
      name: m.name.trim(),
      alias: m.alias?.trim() || undefined,
      priority: m.priority,
      testModel: m.testModel,
      image: m.image === true,
      thinking: parseThinkingJson(m.thinkingJson),
    }))
    .filter((m) => m.name);
  const apiKeyEntries =
    input.apiKeyEntries
      ?.map((entry, index) => {
        const fallbackApiKey =
          entry.existingApiKey?.trim() || existing?.apiKeyEntries?.[index]?.apiKey?.trim() || '';
        return {
          apiKey: entry.apiKey.trim() || fallbackApiKey,
          proxyUrl: entry.proxyUrl.trim() || undefined,
          authIndex: entry.authIndex?.trim() || undefined,
        };
      })
      .filter((entry) => entry.apiKey) ?? [];

  return {
    ...(existing ?? {}),
    name: input.name.trim(),
    baseUrl: input.baseUrl.trim(),
    prefix: input.prefix.trim() || undefined,
    apiKeyEntries: apiKeyEntries.length ? apiKeyEntries : (existing?.apiKeyEntries ?? []),
    disabled: input.disabled,
    disableCooling: input.disableCooling === true,
    headers: Object.keys(headers).length ? headers : undefined,
    models: models.length ? models : undefined,
    priority: input.priority,
    testModel: input.testModel?.trim() || undefined,
  };
};

/* -------------------------------------------------------------------------- */
/* hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useProviderWorkbench(): UseProviderWorkbenchResult {
  const connectionStatus = useAuthStore((s) => s.connectionStatus);
  const config = useConfigStore((s) => s.config);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const updateConfigValue = useConfigStore((s) => s.updateConfigValue);
  const clearCache = useConfigStore((s) => s.clearCache);
  const isCacheValid = useConfigStore((s) => s.isCacheValid);

  const [isPending, setIsPending] = useState<boolean>(() => !isCacheValid());
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mutating, setMutating] = useState<boolean>(false);
  const [fetchedAt, setFetchedAt] = useState<string>(() => new Date().toISOString());

  const hasFetchedRef = useRef(false);

  const connected = connectionStatus === 'connected';

  const refetch = useCallback(async () => {
    setIsFetching(true);
    setErrorMessage(null);
    try {
      const [configResult, vertexResult, openaiResult] = await Promise.allSettled([
        fetchConfig(undefined, true),
        providersApi.getVertexConfigs(),
        providersApi.getOpenAIProviders(),
      ]);
      if (configResult.status !== 'fulfilled') {
        throw configResult.reason;
      }
      if (vertexResult.status === 'fulfilled') {
        updateConfigValue('vertex-api-key', vertexResult.value || []);
        clearCache('vertex-api-key');
      }
      if (openaiResult.status === 'fulfilled') {
        updateConfigValue('openai-compatibility', openaiResult.value || []);
        clearCache('openai-compatibility');
      }
      setFetchedAt(new Date().toISOString());
    } catch (err) {
      setErrorMessage(getErrorMessage(err) || 'Failed to load providers');
    } finally {
      setIsPending(false);
      setIsFetching(false);
    }
  }, [clearCache, fetchConfig, updateConfigValue]);

  const refreshSnapshot = useCallback(() => {
    setFetchedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    if (!connected) return;
    hasFetchedRef.current = true;
    const id = window.setTimeout(() => {
      refetch().catch(() => {});
    }, 0);
    return () => window.clearTimeout(id);
  }, [connected, refetch]);

  /* ------------------- snapshot 计算 ------------------- */

  const snapshot = useMemo<ProviderSnapshot | null>(() => {
    if (!config) return null;
    const groups: ProviderGroup[] = PROVIDER_BRAND_ORDER.map((brand) => {
      let resources: ProviderResource[] = [];
      switch (brand) {
        case 'kimi': {
          const raw = buildKimiRaw(config);
          resources = raw.openai.map(({ config: item, index }) => ({
            ...openaiToResource(item, index),
            id: `kimi:${index}:${item.name}`,
            brand: 'kimi' as const,
            name: KIMI_DISPLAY_NAME,
            identifier: KIMI_DISPLAY_NAME,
            selector: { brand: 'kimi' as const, name: item.name, index },
          }));
          break;
        }
        case 'gemini':
          resources = (config.geminiApiKeys ?? []).reduce<ProviderResource[]>((out, item, index) => {
            if (!isCode0GeminiProvider(item) && !isQiniuCloudGeminiProvider(item) && !isLmuAIGeminiProvider(item)) out.push(geminiToResource(item, index));
            return out;
          }, []);
          break;
        case 'interactions':
          resources = (config.interactionsApiKeys ?? []).map((item, index) =>
            interactionsToResource(item, index)
          );
          break;
        case 'codex':
          resources = (config.codexApiKeys ?? []).reduce<ProviderResource[]>((out, item, index) => {
            if (!isCode0CodexProvider(item) && !isFennoAICodexProvider(item) && !isQiniuCloudCodexProvider(item) && !isLmuAICodexProvider(item)) out.push(codexToResource(item, index));
            return out;
          }, []);
          break;
        case 'xai':
          resources = (config.xaiApiKeys ?? []).map((c, i) => xaiToResource(c, i));
          break;
        case 'claude':
          resources = (config.claudeApiKeys ?? []).reduce<ProviderResource[]>((out, item, index) => {
            if (!isClaudeApiProvider(item) && !isCode0ClaudeProvider(item) && !isFennoAIClaudeProvider(item) && !isQiniuCloudClaudeProvider(item) && !isLmuAIClaudeProvider(item)) {
              out.push(claudeToResource(item, index));
            }
            return out;
          }, []);
          break;
        case 'claudeApi':
          resources = (config.claudeApiKeys ?? []).reduce<ProviderResource[]>((out, item, index) => {
            if (isClaudeApiProvider(item)) out.push(claudeApiToResource(item, index));
            return out;
          }, []);
          break;
        case 'vertex':
          resources = (config.vertexApiKeys ?? []).map((c, i) => vertexToResource(c, i));
          break;
        case 'openaiCompatibility':
          resources = (config.openaiCompatibility ?? []).reduce<ProviderResource[]>((out, item, index) => {
            if (!isCode0OpenAIProvider(item) && !isQiniuCloudOpenAIProvider(item) && !isLmuAIOpenAIProvider(item)) out.push(openaiToResource(item, index));
            return out;
          }, []);
          break;
        case 'code0': {
          const resource = code0ToResource(buildCode0Raw(config));
          resources = resource ? [resource] : [];
          break;
        }
        case 'fennoAI': {
          const resource = fennoAIToResource(buildFennoAIRaw(config));
          resources = resource ? [resource] : [];
          break;
        }
        case 'qiniuCloud': {
          const resource = qiniuCloudToResource(buildQiniuCloudRaw(config));
          resources = resource ? [resource] : [];
          break;
        }
        case 'lmuAI': {
          const resource = lmuAIToResource(buildLmuAIRaw(config));
          resources = resource ? [resource] : [];
          break;
        }
      }
      return {
        id: brand,
        resources,
        issue: null,
        path: PROVIDER_PATHS[brand],
      };
    });
    return {
      fetchedAt,
      groups,
      issues: [],
    };
  }, [config, fetchedAt]);

  /* ------------------- mutations ------------------- */

  const persistGeminiKeys = useCallback(
    async (next: GeminiKeyConfig[]) => {
      await providersApi.saveGeminiKeys(next);
      updateConfigValue('gemini-api-key', next);
      clearCache('gemini-api-key');
    },
    [clearCache, updateConfigValue]
  );

  const updateInteractionsConfig = useCallback(
    (next: GeminiKeyConfig[]) => {
      updateConfigValue('interactions-api-key', next);
      clearCache('interactions-api-key');
    },
    [clearCache, updateConfigValue]
  );

  const persistCodexConfigs = useCallback(
    async (next: ProviderKeyConfig[]) => {
      await providersApi.saveCodexConfigs(next);
      updateConfigValue('codex-api-key', next);
      clearCache('codex-api-key');
    },
    [clearCache, updateConfigValue]
  );

  const persistXAIConfigs = useCallback(
    async (next: ProviderKeyConfig[]) => {
      await providersApi.saveXAIConfigs(next);
      updateConfigValue('xai-api-key', next);
      clearCache('xai-api-key');
    },
    [clearCache, updateConfigValue]
  );

  const persistClaudeConfigs = useCallback(
    async (next: ProviderKeyConfig[]) => {
      await providersApi.saveClaudeConfigs(next);
      updateConfigValue('claude-api-key', next);
      clearCache('claude-api-key');
    },
    [clearCache, updateConfigValue]
  );

  const persistVertexConfigs = useCallback(
    async (next: ProviderKeyConfig[]) => {
      await providersApi.saveVertexConfigs(next);
      updateConfigValue('vertex-api-key', next);
      clearCache('vertex-api-key');
    },
    [clearCache, updateConfigValue]
  );

  const persistOpenAIConfigs = useCallback(
    async (next: OpenAIProviderConfig[]) => {
      await providersApi.saveOpenAIProviders(next);
      updateConfigValue('openai-compatibility', next);
      clearCache('openai-compatibility');
    },
    [clearCache, updateConfigValue]
  );

  const persistCode0 = useCallback(
    async (input: ProviderEntryFormInput) => {
      const raw = buildCode0Raw(config);
      const entries = getCode0KeyEntries(input);
      const openaiEntry = entries.find((entry) => entry.protocol === 'openai');
      const claudeEntry = entries.find((entry) => entry.protocol === 'claude');
      const codexEntry = entries.find((entry) => entry.protocol === 'codex');
      const geminiEntry = entries.find((entry) => entry.protocol === 'gemini');
      const nextOpenAI = (config?.openaiCompatibility ?? []).filter(
        (_, index) => !raw.openai.some((item) => item.index === index)
      );
      const nextClaude = (config?.claudeApiKeys ?? []).filter(
        (_, index) => !raw.claude.some((item) => item.index === index)
      );
      const nextCodex = (config?.codexApiKeys ?? []).filter(
        (_, index) => !raw.codex.some((item) => item.index === index)
      );
      const nextGemini = (config?.geminiApiKeys ?? []).filter(
        (_, index) => !raw.gemini.some((item) => item.index === index)
      );

      await runMultiProtocolMutationWithRecovery(async () => {
        await persistGeminiKeys(
          geminiEntry
            ? [...nextGemini, buildCode0ProviderKey(geminiEntry, raw.gemini[0]?.config)]
            : nextGemini
        );
        await persistCodexConfigs(
          codexEntry
            ? [...nextCodex, buildCode0ProviderKey(codexEntry, raw.codex[0]?.config)]
            : nextCodex
        );
        await persistClaudeConfigs(
          claudeEntry
            ? [...nextClaude, buildCode0ProviderKey(claudeEntry, raw.claude[0]?.config)]
            : nextClaude
        );
        await persistOpenAIConfigs(
          openaiEntry
            ? [...nextOpenAI, buildCode0OpenAI(openaiEntry, raw.openai[0]?.config)]
            : nextOpenAI
        );
      }, refetch);
    },
    [config, persistClaudeConfigs, persistCodexConfigs, persistGeminiKeys, persistOpenAIConfigs, refetch]
  );

  const persistMultiProtocolLists = useCallback(async (next: MultiProtocolConfigLists) => {
    await runMultiProtocolMutationWithRecovery(async () => {
      await persistGeminiKeys(next.geminiApiKeys);
      await persistCodexConfigs(next.codexApiKeys);
      await persistClaudeConfigs(next.claudeApiKeys);
      await persistOpenAIConfigs(next.openaiCompatibility);
    }, refetch);
  }, [persistClaudeConfigs, persistCodexConfigs, persistGeminiKeys, persistOpenAIConfigs, refetch]);

  const createProvider = useCallback(
    async (brand: ProviderBrand, input: ProviderEntryFormInput) => {
      setMutating(true);
      try {
        if (brand === 'gemini') {
          const next = [...(config?.geminiApiKeys ?? [])];
          next.push(buildProviderKeyConfig('gemini', input) as GeminiKeyConfig);
          await persistGeminiKeys(next);
        } else if (brand === 'interactions') {
          const created = buildProviderKeyConfig('interactions', input) as GeminiKeyConfig;
          await providersApi.createInteractionsKey(created);
          updateInteractionsConfig([...(config?.interactionsApiKeys ?? []), created]);
        } else if (brand === 'codex') {
          const next = [...(config?.codexApiKeys ?? [])];
          next.push(buildProviderKeyConfig('codex', input) as ProviderKeyConfig);
          await persistCodexConfigs(next);
        } else if (brand === 'xai') {
          const next = [...(config?.xaiApiKeys ?? [])];
          next.push(buildProviderKeyConfig('xai', input) as ProviderKeyConfig);
          await persistXAIConfigs(next);
        } else if (brand === 'kimi') {
          const next = [...(config?.openaiCompatibility ?? [])];
          next.push({ ...buildOpenAIConfig(input), name: 'kimi' });
          await persistOpenAIConfigs(next);
        } else if (brand === 'claude') {
          const next = [...(config?.claudeApiKeys ?? [])];
          next.push(buildProviderKeyConfig('claude', input) as ProviderKeyConfig);
          await persistClaudeConfigs(next);
        } else if (brand === 'claudeApi') {
          const next = [...(config?.claudeApiKeys ?? [])];
          next.push(buildClaudeApiConfig(input));
          await persistClaudeConfigs(next);
        } else if (brand === 'vertex') {
          const next = [...(config?.vertexApiKeys ?? [])];
          next.push(buildProviderKeyConfig('vertex', input) as ProviderKeyConfig);
          await persistVertexConfigs(next);
        } else if (brand === 'openaiCompatibility') {
          const next = [...(config?.openaiCompatibility ?? [])];
          next.push(buildOpenAIConfig(input));
          await persistOpenAIConfigs(next);
        } else if (brand === 'code0') {
          await persistCode0(input);
        } else if (isMultiProtocolProviderBrand(brand)) {
          await persistMultiProtocolLists(applyMultiProtocolProviderMutation(brand, config, input));
        }
        refreshSnapshot();
      } finally {
        setMutating(false);
      }
    },
    [
      config,
      persistClaudeConfigs,
      persistCodexConfigs,
      persistGeminiKeys,
      updateInteractionsConfig,
      persistOpenAIConfigs,
      persistCode0,
      persistMultiProtocolLists,
      persistVertexConfigs,
      persistXAIConfigs,
      refreshSnapshot,
    ]
  );

  const updateProvider = useCallback(
    async (resource: ProviderResource, input: ProviderEntryFormInput) => {
      setMutating(true);
      try {
        const brand = resource.brand;
        const idx = resource.originalIndex;
        if (brand === 'gemini') {
          const list = [...(config?.geminiApiKeys ?? [])];
          const existing = list[idx];
          list[idx] = buildProviderKeyConfig('gemini', input, existing) as GeminiKeyConfig;
          await persistGeminiKeys(list);
        } else if (brand === 'interactions') {
          const list = [...(config?.interactionsApiKeys ?? [])];
          const existing = list[idx];
          if (!existing) return;
          const updated = buildProviderKeyConfig('interactions', input, existing) as GeminiKeyConfig;
          await providersApi.updateInteractionsKey(existing.apiKey, existing.baseUrl, updated);
          list[idx] = updated;
          updateInteractionsConfig(list);
        } else if (brand === 'codex') {
          const list = [...(config?.codexApiKeys ?? [])];
          const existing = list[idx];
          list[idx] = buildProviderKeyConfig('codex', input, existing) as ProviderKeyConfig;
          await persistCodexConfigs(list);
        } else if (brand === 'claude') {
          const list = [...(config?.claudeApiKeys ?? [])];
          const existing = list[idx];
          list[idx] = buildProviderKeyConfig('claude', input, existing) as ProviderKeyConfig;
          await persistClaudeConfigs(list);
        } else if (brand === 'claudeApi') {
          const list = [...(config?.claudeApiKeys ?? [])];
          const existing = list[idx];
          list[idx] = buildClaudeApiConfig(input, existing);
          await persistClaudeConfigs(list);
        } else if (brand === 'vertex') {
          const list = [...(config?.vertexApiKeys ?? [])];
          const existing = list[idx];
          list[idx] = buildProviderKeyConfig('vertex', input, existing) as ProviderKeyConfig;
          await persistVertexConfigs(list);
        } else if (brand === 'openaiCompatibility') {
          const list = [...(config?.openaiCompatibility ?? [])];
          const existing = list[idx];
          list[idx] = buildOpenAIConfig(input, existing);
          await persistOpenAIConfigs(list);
        } else if (brand === 'code0') {
          await persistCode0(input);
        } else if (isMultiProtocolProviderBrand(brand)) {
          await persistMultiProtocolLists(applyMultiProtocolProviderMutation(brand, config, input));
        }
        refreshSnapshot();
      } finally {
        setMutating(false);
      }
    },
    [
      config,
      persistClaudeConfigs,
      persistCodexConfigs,
      persistGeminiKeys,
      updateInteractionsConfig,
      persistOpenAIConfigs,
      persistCode0,
      persistMultiProtocolLists,
      persistVertexConfigs,
      refreshSnapshot,
    ]
  );

  const deleteProvider = useCallback(
    async (resource: ProviderResource) => {
      setMutating(true);
      try {
        const sel = resource.selector;
        if (sel.brand === 'gemini') {
          await providersApi.deleteGeminiKey(sel.apiKey, sel.baseUrl);
          const next = (config?.geminiApiKeys ?? []).filter((_, i) => i !== sel.index);
          updateConfigValue('gemini-api-key', next);
          clearCache('gemini-api-key');
        } else if (sel.brand === 'interactions') {
          await providersApi.deleteInteractionsKey(sel.apiKey, sel.baseUrl);
          const next = (config?.interactionsApiKeys ?? []).filter((_, i) => i !== sel.index);
          updateConfigValue('interactions-api-key', next);
          clearCache('interactions-api-key');
        } else if (sel.brand === 'codex') {
          await providersApi.deleteCodexConfig(sel.apiKey, sel.baseUrl);
          const next = (config?.codexApiKeys ?? []).filter((_, i) => i !== sel.index);
          updateConfigValue('codex-api-key', next);
          clearCache('codex-api-key');
        } else if (sel.brand === 'claude' || sel.brand === 'claudeApi') {
          await providersApi.deleteClaudeConfig(sel.apiKey, sel.baseUrl);
          const next = (config?.claudeApiKeys ?? []).filter((_, i) => i !== sel.index);
          updateConfigValue('claude-api-key', next);
          clearCache('claude-api-key');
        } else if (sel.brand === 'vertex') {
          await providersApi.deleteVertexConfig(sel.apiKey, sel.baseUrl);
          const next = (config?.vertexApiKeys ?? []).filter((_, i) => i !== sel.index);
          updateConfigValue('vertex-api-key', next);
          clearCache('vertex-api-key');
        } else if (sel.brand === 'openaiCompatibility') {
          await providersApi.deleteOpenAIProvider(sel.name);
          const next = (config?.openaiCompatibility ?? []).filter((_, i) => i !== sel.index);
          updateConfigValue('openai-compatibility', next);
          clearCache('openai-compatibility');
        } else if (sel.brand === 'code0') {
          const raw = resource.raw as Code0ProviderRaw;
          const nextGemini = (config?.geminiApiKeys ?? []).filter((_, index) => !raw.gemini.some((item) => item.index === index));
          const nextCodex = (config?.codexApiKeys ?? []).filter((_, index) => !raw.codex.some((item) => item.index === index));
          const nextClaude = (config?.claudeApiKeys ?? []).filter((_, index) => !raw.claude.some((item) => item.index === index));
          const nextOpenAI = (config?.openaiCompatibility ?? []).filter((_, index) => !raw.openai.some((item) => item.index === index));
          await persistGeminiKeys(nextGemini);
          await persistCodexConfigs(nextCodex);
          await persistClaudeConfigs(nextClaude);
          await persistOpenAIConfigs(nextOpenAI);
        } else if (isMultiProtocolProviderBrand(sel.brand)) {
          await persistMultiProtocolLists(removeMultiProtocolProviderConfigs(config, resource.raw as MultiProtocolProviderRaw));
        }
        refreshSnapshot();
      } finally {
        setMutating(false);
      }
    },
    [
      clearCache,
      config,
      persistClaudeConfigs,
      persistCodexConfigs,
      persistGeminiKeys,
      persistOpenAIConfigs,
      persistMultiProtocolLists,
      refreshSnapshot,
      updateConfigValue,
    ]
  );

  const toggleDisabled = useCallback(
    async (resource: ProviderResource, disabled: boolean) => {
      setMutating(true);
      try {
        const brand = resource.brand;
        const idx = resource.originalIndex;
        if (brand === 'gemini') {
          const list = [...(config?.geminiApiKeys ?? [])];
          const current = list[idx];
          if (!current) return;
          const excluded = disabled
            ? withDisableAllModelsRule(current.excludedModels)
            : withoutDisableAllModelsRule(current.excludedModels);
          list[idx] = { ...current, excludedModels: excluded };
          await persistGeminiKeys(list);
        } else if (brand === 'interactions') {
          const list = [...(config?.interactionsApiKeys ?? [])];
          const current = list[idx];
          if (!current) return;
          const excludedModels = disabled
            ? withDisableAllModelsRule(current.excludedModels)
            : withoutDisableAllModelsRule(current.excludedModels);
          const updated = { ...current, excludedModels };
          await providersApi.updateInteractionsKey(current.apiKey, current.baseUrl, updated);
          list[idx] = updated;
          updateConfigValue('interactions-api-key', list);
          clearCache('interactions-api-key');
        } else if (
          brand === 'codex' ||
          brand === 'claude' ||
          brand === 'claudeApi' ||
          brand === 'vertex'
        ) {
          const key =
            brand === 'codex'
              ? 'codexApiKeys'
              : brand === 'claude' || brand === 'claudeApi'
                ? 'claudeApiKeys'
                : 'vertexApiKeys';
          const list = [...((config?.[key] as ProviderKeyConfig[] | undefined) ?? [])];
          const current = list[idx];
          if (!current) return;
          const excluded = disabled
            ? withDisableAllModelsRule(current.excludedModels)
            : withoutDisableAllModelsRule(current.excludedModels);
          list[idx] = { ...current, excludedModels: excluded };
          if (brand === 'codex') await persistCodexConfigs(list);
          else if (brand === 'claude' || brand === 'claudeApi') await persistClaudeConfigs(list);
          else await persistVertexConfigs(list);
        } else if (brand === 'openaiCompatibility') {
          await providersApi.updateOpenAIProviderDisabled(idx, disabled);
          const list = [...(config?.openaiCompatibility ?? [])];
          const current = list[idx];
          if (current) {
            list[idx] = { ...current, disabled };
            updateConfigValue('openai-compatibility', list);
            clearCache('openai-compatibility');
          }
        } else if (brand === 'code0') {
          const raw = resource.raw as Code0ProviderRaw;
          await persistGeminiKeys((config?.geminiApiKeys ?? []).map((item, index) => raw.gemini.some((rawItem) => rawItem.index === index) ? { ...item, excludedModels: disabled ? withDisableAllModelsRule(item.excludedModels) : withoutDisableAllModelsRule(item.excludedModels) } : item));
          await persistCodexConfigs((config?.codexApiKeys ?? []).map((item, index) => raw.codex.some((rawItem) => rawItem.index === index) ? { ...item, excludedModels: disabled ? withDisableAllModelsRule(item.excludedModels) : withoutDisableAllModelsRule(item.excludedModels) } : item));
          await persistClaudeConfigs((config?.claudeApiKeys ?? []).map((item, index) => raw.claude.some((rawItem) => rawItem.index === index) ? { ...item, excludedModels: disabled ? withDisableAllModelsRule(item.excludedModels) : withoutDisableAllModelsRule(item.excludedModels) } : item));
          await persistOpenAIConfigs((config?.openaiCompatibility ?? []).map((item, index) => raw.openai.some((rawItem) => rawItem.index === index) ? { ...item, disabled } : item));
        } else if (isMultiProtocolProviderBrand(brand)) {
          await persistMultiProtocolLists(toggleMultiProtocolProviderConfigs(config, resource.raw as MultiProtocolProviderRaw, disabled));
        }
        refreshSnapshot();
      } finally {
        setMutating(false);
      }
    },
    [
      clearCache,
      config,
      persistClaudeConfigs,
      persistCodexConfigs,
      persistGeminiKeys,
      persistMultiProtocolLists,
      persistOpenAIConfigs,
      persistVertexConfigs,
      refreshSnapshot,
      updateConfigValue,
    ]
  );

  return {
    connected,
    isPending,
    isFetching,
    isError: Boolean(errorMessage),
    errorMessage,
    snapshot,
    refetch,
    createProvider,
    updateProvider,
    deleteProvider,
    toggleDisabled,
    mutating,
    refreshSnapshot,
  };
}
