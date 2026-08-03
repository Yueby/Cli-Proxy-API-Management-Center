import {
  withDisableAllModelsRule,
  withoutDisableAllModelsRule,
} from '@/components/providers/utils';
import type {
  Config,
  GeminiKeyConfig,
  OpenAIProviderConfig,
  ProviderKeyConfig,
} from '@/types';
import { buildFennoAIRaw } from './fennoAI';
import { buildLmuAIRaw } from './lmuAI';
import { getMultiProtocolProviderDefinition, multiProtocolUrl } from './multiProtocolDefinitions';
import { buildQiniuCloudRaw } from './qiniuCloud';
import type {
  MultiProtocolKeyEntryInput,
  MultiProtocolProviderBrand,
  MultiProtocolProviderRaw,
  ProviderEntryFormInput,
} from './types';

export interface MultiProtocolConfigLists {
  openaiCompatibility: OpenAIProviderConfig[];
  claudeApiKeys: ProviderKeyConfig[];
  codexApiKeys: ProviderKeyConfig[];
  geminiApiKeys: GeminiKeyConfig[];
}

const listsFromConfig = (config: Config | null | undefined): MultiProtocolConfigLists => ({
  openaiCompatibility: [...(config?.openaiCompatibility ?? [])],
  claudeApiKeys: [...(config?.claudeApiKeys ?? [])],
  codexApiKeys: [...(config?.codexApiKeys ?? [])],
  geminiApiKeys: [...(config?.geminiApiKeys ?? [])],
});

const rawForBrand = (
  brand: MultiProtocolProviderBrand,
  config: Config | null | undefined
): MultiProtocolProviderRaw => {
  if (brand === 'fennoAI') return buildFennoAIRaw(config);
  if (brand === 'qiniuCloud') return buildQiniuCloudRaw(config);
  return buildLmuAIRaw(config);
};

const entryApiKey = (entry: MultiProtocolKeyEntryInput): string =>
  entry.apiKey.trim() || entry.existingApiKey?.trim() || '';

const modelsFromEntry = (entry: MultiProtocolKeyEntryInput) => {
  const models = entry.models
    .map((model) => ({
      name: model.name.trim(),
      alias: model.alias?.trim() || undefined,
      priority: model.priority,
      testModel: model.testModel?.trim() || undefined,
    }))
    .filter((model) => model.name);
  return models.length ? models : undefined;
};

const excludedFromEntry = (entry: MultiProtocolKeyEntryInput): string[] | undefined =>
  entry.disabled ? withDisableAllModelsRule([]) : undefined;

const buildProviderKey = (
  entry: MultiProtocolKeyEntryInput,
  baseUrl: string,
  existing?: ProviderKeyConfig
): ProviderKeyConfig => ({
  ...(existing ?? {}),
  apiKey: entryApiKey(entry),
  baseUrl,
  proxyUrl: entry.proxyUrl.trim() || undefined,
  prefix: entry.prefix.trim() || undefined,
  priority: entry.priority,
  disableCooling: entry.disableCooling === true,
  models: modelsFromEntry(entry),
  excludedModels: excludedFromEntry(entry),
});

const buildGeminiKey = (
  entry: MultiProtocolKeyEntryInput,
  baseUrl: string,
  existing?: GeminiKeyConfig
): GeminiKeyConfig => buildProviderKey(entry, baseUrl, existing) as GeminiKeyConfig;

const buildOpenAI = (
  providerName: string,
  entry: MultiProtocolKeyEntryInput,
  baseUrl: string,
  existing?: OpenAIProviderConfig
): OpenAIProviderConfig => ({
  ...(existing ?? {}),
  name: existing?.name?.trim() || providerName,
  baseUrl,
  apiKeyEntries: [
    {
      apiKey: entryApiKey(entry),
      proxyUrl: entry.proxyUrl.trim() || undefined,
    },
  ],
  prefix: entry.prefix.trim() || undefined,
  priority: entry.priority,
  disableCooling: entry.disableCooling === true,
  models: modelsFromEntry(entry),
  disabled: entry.disabled,
});

const replaceOrAppend = <T>(list: T[], index: number | undefined, value: T): T[] => {
  if (index === undefined) return [...list, value];
  const next = [...list];
  next[index] = value;
  return next;
};

export const applyMultiProtocolProviderMutation = (
  brand: MultiProtocolProviderBrand,
  config: Config | null | undefined,
  input: ProviderEntryFormInput
): MultiProtocolConfigLists => {
  const definition = getMultiProtocolProviderDefinition(brand);
  const current = listsFromConfig(config);
  const raw = rawForBrand(brand, config);
  const entries = (input.multiProtocolKeyEntries ?? []).filter((entry) => entryApiKey(entry));
  const retainedProtocols = new Set(entries.map((entry) => entry.protocol));

  const next = removeMultiProtocolProviderConfigs(current, {
    openai: retainedProtocols.has('openai') ? [] : raw.openai,
    claude: retainedProtocols.has('claude') ? [] : raw.claude,
    codex: retainedProtocols.has('codex') ? [] : raw.codex,
    gemini: retainedProtocols.has('gemini') ? [] : raw.gemini,
  });

  entries.forEach((entry) => {
    const baseUrl = definition.resolveBaseUrl(entry.baseUrl);
    const urls = definition.getProtocolUrls(baseUrl);
    const endpoint = multiProtocolUrl(urls, entry.protocol);
    if (entry.protocol === 'openai') {
      const existingItem = raw.openai[0];
      next.openaiCompatibility = replaceOrAppend(
        next.openaiCompatibility,
        existingItem?.index,
        buildOpenAI(definition.providerName, entry, endpoint, existingItem?.config)
      );
    } else if (entry.protocol === 'claude') {
      const existingItem = raw.claude[0];
      next.claudeApiKeys = replaceOrAppend(
        next.claudeApiKeys,
        existingItem?.index,
        buildProviderKey(entry, endpoint, existingItem?.config)
      );
    } else if (entry.protocol === 'codex') {
      const existingItem = raw.codex[0];
      next.codexApiKeys = replaceOrAppend(
        next.codexApiKeys,
        existingItem?.index,
        buildProviderKey(entry, endpoint, existingItem?.config)
      );
    } else {
      const existingItem = raw.gemini[0];
      next.geminiApiKeys = replaceOrAppend(
        next.geminiApiKeys,
        existingItem?.index,
        buildGeminiKey(entry, endpoint, existingItem?.config)
      );
    }
  });

  return next;
};

const removeIndices = <T>(list: T[], indices: number[]): T[] => {
  const removed = new Set(indices);
  return list.filter((_, index) => !removed.has(index));
};

export const removeMultiProtocolProviderConfigs = (
  config: Config | MultiProtocolConfigLists | null | undefined,
  raw: MultiProtocolProviderRaw
): MultiProtocolConfigLists => {
  const current = listsFromConfig(config);
  return {
    openaiCompatibility: removeIndices(
      current.openaiCompatibility,
      raw.openai.map((item) => item.index)
    ),
    claudeApiKeys: removeIndices(
      current.claudeApiKeys,
      raw.claude.map((item) => item.index)
    ),
    codexApiKeys: removeIndices(
      current.codexApiKeys,
      raw.codex.map((item) => item.index)
    ),
    geminiApiKeys: removeIndices(
      current.geminiApiKeys,
      raw.gemini.map((item) => item.index)
    ),
  };
};

export const toggleMultiProtocolProviderConfigs = (
  config: Config | null | undefined,
  raw: MultiProtocolProviderRaw,
  disabled: boolean
): MultiProtocolConfigLists => {
  const next = listsFromConfig(config);
  const toggleExcluded = (value: string[] | undefined) =>
    disabled ? withDisableAllModelsRule(value) : withoutDisableAllModelsRule(value);
  raw.openai.forEach(({ index }) => {
    const current = next.openaiCompatibility[index];
    if (current) next.openaiCompatibility[index] = { ...current, disabled };
  });
  raw.claude.forEach(({ index }) => {
    const current = next.claudeApiKeys[index];
    if (current) next.claudeApiKeys[index] = { ...current, excludedModels: toggleExcluded(current.excludedModels) };
  });
  raw.codex.forEach(({ index }) => {
    const current = next.codexApiKeys[index];
    if (current) next.codexApiKeys[index] = { ...current, excludedModels: toggleExcluded(current.excludedModels) };
  });
  raw.gemini.forEach(({ index }) => {
    const current = next.geminiApiKeys[index];
    if (current) next.geminiApiKeys[index] = { ...current, excludedModels: toggleExcluded(current.excludedModels) };
  });
  return next;
};
