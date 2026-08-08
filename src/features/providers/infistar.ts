import type { Config, GeminiKeyConfig, OpenAIProviderConfig, ProviderKeyConfig } from '@/types';
import type { MultiProtocolProviderRaw } from './types';

export const INFISTAR_PROVIDER_NAME = 'infistar';
export const INFISTAR_DISPLAY_NAME = '无限星河';
export const INFISTAR_DOMESTIC_ROOT_URL = 'https://coneverse.com';
export const INFISTAR_GLOBAL_ROOT_URL = 'https://infistar.ai';
export const INFISTAR_DOMESTIC_BASE_URL = `${INFISTAR_DOMESTIC_ROOT_URL}/v1`;
export const INFISTAR_GLOBAL_BASE_URL = `${INFISTAR_GLOBAL_ROOT_URL}/v1`;

export const INFISTAR_BASE_URL_OPTIONS = [
  {
    id: 'mainlandChina',
    descriptionKey: 'mainlandChina',
    baseUrl: INFISTAR_DOMESTIC_BASE_URL,
    openaiBaseUrl: INFISTAR_DOMESTIC_BASE_URL,
    codexBaseUrl: INFISTAR_DOMESTIC_BASE_URL,
    anthropicBaseUrl: INFISTAR_DOMESTIC_ROOT_URL,
    geminiBaseUrl: INFISTAR_DOMESTIC_ROOT_URL,
  },
  {
    id: 'global',
    descriptionKey: 'global',
    baseUrl: INFISTAR_GLOBAL_BASE_URL,
    openaiBaseUrl: INFISTAR_GLOBAL_BASE_URL,
    codexBaseUrl: INFISTAR_GLOBAL_BASE_URL,
    anthropicBaseUrl: INFISTAR_GLOBAL_ROOT_URL,
    geminiBaseUrl: INFISTAR_GLOBAL_ROOT_URL,
  },
] as const;

export const INFISTAR_PROTOCOL_LABELS = [
  'openai',
  'anthropic',
  'gemini',
  'codexResponses',
] as const;

const normalizeBaseUrl = (value: string | undefined | null): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\/+$/, '');

export const resolveInfistarBaseUrl = (value: string | undefined | null): string => {
  const normalized = normalizeBaseUrl(value);
  const matched = INFISTAR_BASE_URL_OPTIONS.find((option) =>
    [
      option.baseUrl,
      option.openaiBaseUrl,
      option.codexBaseUrl,
      option.anthropicBaseUrl,
      option.geminiBaseUrl,
    ].some((endpoint) => normalized === normalizeBaseUrl(endpoint))
  );
  return matched?.baseUrl ?? INFISTAR_DOMESTIC_BASE_URL;
};

export const getInfistarProtocolUrls = (value: string | undefined | null) => {
  const baseUrl = resolveInfistarBaseUrl(value);
  const matched =
    INFISTAR_BASE_URL_OPTIONS.find(
      (option) => normalizeBaseUrl(option.baseUrl) === normalizeBaseUrl(baseUrl)
    ) ?? INFISTAR_BASE_URL_OPTIONS[0];
  return {
    openai: matched.openaiBaseUrl,
    codex: matched.codexBaseUrl,
    anthropic: matched.anthropicBaseUrl,
    gemini: matched.geminiBaseUrl,
  };
};

const matchesEndpoint = (
  value: string | undefined | null,
  endpoints: readonly string[]
): boolean => {
  const normalized = normalizeBaseUrl(value);
  return endpoints.some((endpoint) => normalized === normalizeBaseUrl(endpoint));
};

export const isInfistarOpenAIProvider = (
  config: OpenAIProviderConfig | undefined | null
): boolean =>
  Boolean(
    config &&
    matchesEndpoint(
      config.baseUrl,
      INFISTAR_BASE_URL_OPTIONS.flatMap((option) => [option.openaiBaseUrl, option.codexBaseUrl])
    )
  );

export const isInfistarClaudeProvider = (config: ProviderKeyConfig | undefined | null): boolean =>
  Boolean(
    config &&
    matchesEndpoint(
      config.baseUrl,
      INFISTAR_BASE_URL_OPTIONS.map((option) => option.anthropicBaseUrl)
    )
  );

export const isInfistarCodexProvider = (config: ProviderKeyConfig | undefined | null): boolean =>
  Boolean(
    config &&
    matchesEndpoint(
      config.baseUrl,
      INFISTAR_BASE_URL_OPTIONS.map((option) => option.codexBaseUrl)
    )
  );

export const isInfistarGeminiProvider = (config: GeminiKeyConfig | undefined | null): boolean =>
  Boolean(
    config &&
    matchesEndpoint(
      config.baseUrl,
      INFISTAR_BASE_URL_OPTIONS.map((option) => option.geminiBaseUrl)
    )
  );

export const buildInfistarRaw = (config: Config | null | undefined): MultiProtocolProviderRaw => ({
  openai: (config?.openaiCompatibility ?? [])
    .map((item, index) => ({ config: item, index }))
    .filter((item) => isInfistarOpenAIProvider(item.config)),
  claude: (config?.claudeApiKeys ?? [])
    .map((item, index) => ({ config: item, index }))
    .filter((item) => isInfistarClaudeProvider(item.config)),
  codex: (config?.codexApiKeys ?? [])
    .map((item, index) => ({ config: item, index }))
    .filter((item) => isInfistarCodexProvider(item.config)),
  gemini: (config?.geminiApiKeys ?? [])
    .map((item, index) => ({ config: item, index }))
    .filter((item) => isInfistarGeminiProvider(item.config)),
});
