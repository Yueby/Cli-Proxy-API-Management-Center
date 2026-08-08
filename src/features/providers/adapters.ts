import type {
  GeminiKeyConfig,
  OpenAIProviderConfig,
  ProviderKeyConfig,
} from '@/types';
import {
  hasDisableAllModelsRule,
  stripDisableAllModelsRule,
} from '@/components/providers/utils';
import { maskApiKey } from '@/utils/format';
import { CLAUDE_API_DISPLAY_NAME } from './claudeApi';
import {
  CODE0_DISPLAY_NAME,
  CODE0_PROTOCOL_LABELS,
  getCode0ProtocolUrls,
  resolveCode0BaseUrl,
} from './code0';
import { FENNO_AI_DISPLAY_NAME, FENNO_AI_PROTOCOL_LABELS, getFennoAIProtocolUrls, resolveFennoAIBaseUrl } from './fennoAI';
import { QINIU_CLOUD_DISPLAY_NAME, QINIU_CLOUD_PROTOCOL_LABELS, getQiniuCloudProtocolUrls, resolveQiniuCloudBaseUrl } from './qiniuCloud';
import { LMU_AI_DISPLAY_NAME, LMU_AI_PROTOCOL_LABELS, getLmuAIProtocolUrls, resolveLmuAIBaseUrl } from './lmuAI';
import { INFISTAR_DISPLAY_NAME, INFISTAR_PROTOCOL_LABELS, getInfistarProtocolUrls, resolveInfistarBaseUrl } from './infistar';
import type {
  MultiProtocolProviderBrand,
  MultiProtocolProviderRaw,
  ProviderBrand,
  ProviderResource,
  ProviderResourceSelector,
  SponsorProviderRaw,
} from './types';

const countHeaders = (headers?: Record<string, string>): number =>
  headers ? Object.keys(headers).length : 0;

const buildId = (brand: ProviderBrand, index: number, fragment: string) =>
  `${brand}:${index}:${fragment || 'item'}`;

const truncateForId = (value: string | undefined | null): string => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= 12) return trimmed;
  return trimmed.slice(0, 8);
};

function providerKeyToResource(
  brand: 'gemini' | 'interactions' | 'codex' | 'xai' | 'claude' | 'claudeApi' | 'vertex',
  config: GeminiKeyConfig | ProviderKeyConfig,
  index: number
): ProviderResource {
  const apiKey = config.apiKey ?? '';
  const disabled = hasDisableAllModelsRule(config.excludedModels);
  const flags: ProviderResource['flags'] = {};
  if (brand === 'codex' || brand === 'xai') {
    flags.websockets = (config as ProviderKeyConfig).websockets === true;
  }
  if (brand === 'claude' || brand === 'claudeApi') {
    const cloak = (config as ProviderKeyConfig).cloak;
    flags.cloakEnabled = Boolean(cloak?.mode?.trim());
  }

  const selector: ProviderResourceSelector = {
    brand,
    apiKey,
    baseUrl: config.baseUrl,
    index,
  } as ProviderResourceSelector;

  return {
    id: buildId(brand, index, truncateForId(apiKey)),
    brand,
    originalIndex: index,
    name: null,
    identifier: maskApiKey(apiKey) || `#${index + 1}`,
    apiKeyPreview: apiKey ? maskApiKey(apiKey) : null,
    apiKey: apiKey || null,
    authIndex: config.authIndex ?? null,
    baseUrl: config.baseUrl ?? null,
    proxyUrl: config.proxyUrl ?? null,
    prefix: config.prefix ?? null,
    modelCount: config.models?.length ?? 0,
    models: (config.models ?? []).map((model) => model.name),
    headerCount: countHeaders(config.headers),
    excludedModelCount: stripDisableAllModelsRule(config.excludedModels).length,
    apiKeyEntryCount: 0,
    disabled,
    flags,
    selector,
    raw: config,
  };
}

export function geminiToResource(config: GeminiKeyConfig, index: number): ProviderResource {
  return providerKeyToResource('gemini', config, index);
}

export function interactionsToResource(config: GeminiKeyConfig, index: number): ProviderResource {
  return providerKeyToResource('interactions', config, index);
}

export function codexToResource(config: ProviderKeyConfig, index: number): ProviderResource {
  return providerKeyToResource('codex', config, index);
}

export function xaiToResource(config: ProviderKeyConfig, index: number): ProviderResource {
  return providerKeyToResource('xai', config, index);
}

export function claudeToResource(config: ProviderKeyConfig, index: number): ProviderResource {
  return providerKeyToResource('claude', config, index);
}

export function claudeApiToResource(config: ProviderKeyConfig, index: number): ProviderResource {
  return {
    ...providerKeyToResource('claudeApi', config, index),
    name: CLAUDE_API_DISPLAY_NAME,
  };
}

export function vertexToResource(config: ProviderKeyConfig, index: number): ProviderResource {
  return providerKeyToResource('vertex', config, index);
}

export function openaiToResource(
  config: OpenAIProviderConfig,
  index: number
): ProviderResource {
  const name = (config.name ?? '').trim();
  const firstEntry = config.apiKeyEntries?.[0];
  const previewApiKey = firstEntry?.apiKey ? maskApiKey(firstEntry.apiKey) : null;
  return {
    id: buildId('openaiCompatibility', index, truncateForId(name) || `#${index}`),
    brand: 'openaiCompatibility',
    originalIndex: index,
    name: name || null,
    identifier: name || `#${index + 1}`,
    apiKeyPreview: previewApiKey,
    apiKey: null,
    authIndex: config.authIndex ?? null,
    baseUrl: config.baseUrl ?? null,
    proxyUrl: null,
    prefix: config.prefix ?? null,
    modelCount: config.models?.length ?? 0,
    models: (config.models ?? []).map((model) => model.name),
    headerCount: countHeaders(config.headers),
    excludedModelCount: 0,
    apiKeyEntryCount: config.apiKeyEntries?.length ?? 0,
    disabled: config.disabled === true,
    flags: {},
    selector: { brand: 'openaiCompatibility', name, index },
    raw: config,
  };
}

export function code0ToResource(raw: SponsorProviderRaw): ProviderResource | null {
  if (!raw.openai.length && !raw.claude.length && !raw.codex.length && !raw.gemini.length) {
    return null;
  }
  const firstOpenAIEntry = raw.openai
    .flatMap((item) => item.config.apiKeyEntries ?? [])
    .find((entry) => entry.apiKey?.trim());
  const apiKey =
    firstOpenAIEntry?.apiKey ??
    raw.codex[0]?.config.apiKey ??
    raw.claude[0]?.config.apiKey ??
    raw.gemini[0]?.config.apiKey ??
    '';
  const urls = getCode0ProtocolUrls(
    resolveCode0BaseUrl(
      raw.openai[0]?.config.baseUrl ??
        raw.codex[0]?.config.baseUrl ??
        raw.claude[0]?.config.baseUrl ??
        raw.gemini[0]?.config.baseUrl
    )
  );
  const disabled =
    (raw.openai.length ? raw.openai.every((item) => item.config.disabled === true) : true) &&
    (raw.codex.length
      ? raw.codex.every((item) => hasDisableAllModelsRule(item.config.excludedModels))
      : true) &&
    (raw.claude.length
      ? raw.claude.every((item) => hasDisableAllModelsRule(item.config.excludedModels))
      : true) &&
    (raw.gemini.length
      ? raw.gemini.every((item) => hasDisableAllModelsRule(item.config.excludedModels))
      : true);

  return {
    id: buildId('code0', 0, 'provider'),
    brand: 'code0',
    originalIndex: 0,
    name: CODE0_DISPLAY_NAME,
    identifier: CODE0_DISPLAY_NAME,
    apiKeyPreview: apiKey ? maskApiKey(apiKey) : null,
    apiKey: apiKey || null,
    authIndex: null,
    baseUrl: [urls.openai, urls.anthropic, urls.gemini].join(' / '),
    proxyUrl:
      firstOpenAIEntry?.proxyUrl ??
      raw.codex[0]?.config.proxyUrl ??
      raw.claude[0]?.config.proxyUrl ??
      raw.gemini[0]?.config.proxyUrl ??
      null,
    prefix:
      raw.openai[0]?.config.prefix ??
      raw.codex[0]?.config.prefix ??
      raw.claude[0]?.config.prefix ??
      raw.gemini[0]?.config.prefix ??
      null,
    modelCount:
      raw.openai.reduce((count, item) => count + (item.config.models?.length ?? 0), 0) +
      raw.codex.reduce((count, item) => count + (item.config.models?.length ?? 0), 0) +
      raw.claude.reduce((count, item) => count + (item.config.models?.length ?? 0), 0) +
      raw.gemini.reduce((count, item) => count + (item.config.models?.length ?? 0), 0),
    models: [
      ...raw.openai.flatMap((item) => item.config.models ?? []),
      ...raw.codex.flatMap((item) => item.config.models ?? []),
      ...raw.claude.flatMap((item) => item.config.models ?? []),
      ...raw.gemini.flatMap((item) => item.config.models ?? []),
    ].map((model) => model.name),
    headerCount:
      raw.openai.reduce((count, item) => count + countHeaders(item.config.headers), 0) +
      raw.codex.reduce((count, item) => count + countHeaders(item.config.headers), 0) +
      raw.claude.reduce((count, item) => count + countHeaders(item.config.headers), 0) +
      raw.gemini.reduce((count, item) => count + countHeaders(item.config.headers), 0),
    excludedModelCount:
      raw.codex.reduce(
        (count, item) => count + stripDisableAllModelsRule(item.config.excludedModels).length,
        0
      ) +
      raw.claude.reduce(
        (count, item) => count + stripDisableAllModelsRule(item.config.excludedModels).length,
        0
      ) +
      raw.gemini.reduce(
        (count, item) => count + stripDisableAllModelsRule(item.config.excludedModels).length,
        0
      ),
    apiKeyEntryCount:
      raw.openai.reduce((count, item) => count + (item.config.apiKeyEntries?.length ?? 0), 0) +
      raw.codex.length +
      raw.claude.length +
      raw.gemini.length,
    disabled,
    flags: { protocols: [...CODE0_PROTOCOL_LABELS] },
    selector: {
      brand: 'code0',
      openaiIndices: raw.openai.map((item) => item.index),
      claudeIndices: raw.claude.map((item) => item.index),
      codexIndices: raw.codex.map((item) => item.index),
      geminiIndices: raw.gemini.map((item) => item.index),
    },
    raw,
  };
}


interface MultiProtocolResourceOptions {
  displayName: string;
  protocolLabels: readonly string[];
  resolveBaseUrl: (value: string | undefined | null) => string;
  getProtocolUrls: (value: string | undefined | null) => { anthropic: string; openai: string; codex: string; gemini: string };
}

function multiProtocolRawToResource(brand: MultiProtocolProviderBrand, raw: MultiProtocolProviderRaw, options: MultiProtocolResourceOptions): ProviderResource | null {
  if (!raw.openai.length && !raw.claude.length && !raw.codex.length && !raw.gemini.length) return null;
  const firstOpenAIEntry = raw.openai.flatMap((item) => item.config.apiKeyEntries ?? [])[0];
  const apiKey = firstOpenAIEntry?.apiKey ?? raw.codex[0]?.config.apiKey ?? raw.claude[0]?.config.apiKey ?? raw.gemini[0]?.config.apiKey ?? '';
  const baseUrl = options.resolveBaseUrl(raw.openai[0]?.config.baseUrl ?? raw.codex[0]?.config.baseUrl ?? raw.claude[0]?.config.baseUrl ?? raw.gemini[0]?.config.baseUrl);
  const urls = options.getProtocolUrls(baseUrl);
  const models = [...raw.openai.flatMap((i) => i.config.models ?? []), ...raw.codex.flatMap((i) => i.config.models ?? []), ...raw.claude.flatMap((i) => i.config.models ?? []), ...raw.gemini.flatMap((i) => i.config.models ?? [])].map((m) => m.name).filter(Boolean);
  const allDisabled = raw.openai.every((i) => i.config.disabled === true) && raw.claude.every((i) => hasDisableAllModelsRule(i.config.excludedModels)) && raw.codex.every((i) => hasDisableAllModelsRule(i.config.excludedModels)) && raw.gemini.every((i) => hasDisableAllModelsRule(i.config.excludedModels));
  return {
    id: buildId(brand, 0, 'multi-protocol'), brand, originalIndex: 0, name: options.displayName, identifier: options.displayName,
    apiKeyPreview: apiKey ? maskApiKey(apiKey) : null, apiKey: apiKey || null, authIndex: null,
    baseUrl: [urls.openai, urls.anthropic, urls.gemini].filter(Boolean).join(' / '),
    proxyUrl: firstOpenAIEntry?.proxyUrl ?? raw.codex[0]?.config.proxyUrl ?? raw.claude[0]?.config.proxyUrl ?? raw.gemini[0]?.config.proxyUrl ?? null,
    prefix: raw.openai[0]?.config.prefix ?? raw.codex[0]?.config.prefix ?? raw.claude[0]?.config.prefix ?? raw.gemini[0]?.config.prefix ?? null,
    modelCount: new Set(models).size, models: [...new Set(models)], headerCount: 0, excludedModelCount: 0,
    apiKeyEntryCount: raw.openai.reduce((n,i)=>n+(i.config.apiKeyEntries?.length??0),0)+raw.codex.length+raw.claude.length+raw.gemini.length,
    disabled: raw.openai.length + raw.claude.length + raw.codex.length + raw.gemini.length > 0 && allDisabled,
    flags: { protocols: [...options.protocolLabels] },
    selector: { brand, openaiIndices: raw.openai.map(i=>i.index), claudeIndices: raw.claude.map(i=>i.index), codexIndices: raw.codex.map(i=>i.index), geminiIndices: raw.gemini.map(i=>i.index) }, raw,
  };
}
export const fennoAIToResource = (raw: MultiProtocolProviderRaw) => multiProtocolRawToResource('fennoAI', raw, { displayName: FENNO_AI_DISPLAY_NAME, protocolLabels: FENNO_AI_PROTOCOL_LABELS, resolveBaseUrl: resolveFennoAIBaseUrl, getProtocolUrls: getFennoAIProtocolUrls });
export const qiniuCloudToResource = (raw: MultiProtocolProviderRaw) => multiProtocolRawToResource('qiniuCloud', raw, { displayName: QINIU_CLOUD_DISPLAY_NAME, protocolLabels: QINIU_CLOUD_PROTOCOL_LABELS, resolveBaseUrl: resolveQiniuCloudBaseUrl, getProtocolUrls: getQiniuCloudProtocolUrls });
export const lmuAIToResource = (raw: MultiProtocolProviderRaw) => multiProtocolRawToResource('lmuAI', raw, { displayName: LMU_AI_DISPLAY_NAME, protocolLabels: LMU_AI_PROTOCOL_LABELS, resolveBaseUrl: resolveLmuAIBaseUrl, getProtocolUrls: getLmuAIProtocolUrls });
export const infistarToResource = (raw: MultiProtocolProviderRaw) => multiProtocolRawToResource('infistar', raw, { displayName: INFISTAR_DISPLAY_NAME, protocolLabels: INFISTAR_PROTOCOL_LABELS, resolveBaseUrl: resolveInfistarBaseUrl, getProtocolUrls: getInfistarProtocolUrls });
