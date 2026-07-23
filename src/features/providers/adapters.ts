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
import type {
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
  brand: 'gemini' | 'codex' | 'xai' | 'claude' | 'claudeApi' | 'vertex',
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
