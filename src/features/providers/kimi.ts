import type { Config, OpenAIProviderConfig, ProviderKeyConfig } from '@/types';

export const KIMI_PROVIDER_NAME = 'kimi';
export const KIMI_DISPLAY_NAME = 'Kimi';
export const KIMI_LEGACY_OPENAI_BASE_URL = 'https://api.moonshot.ai';
export const KIMI_DOMESTIC_BASE_URL = 'https://api.moonshot.cn';
export const KIMI_OPENAI_BASE_URL = `${KIMI_LEGACY_OPENAI_BASE_URL}/v1`;
export const KIMI_DOMESTIC_OPENAI_BASE_URL = `${KIMI_DOMESTIC_BASE_URL}/v1`;
export const KIMI_ANTHROPIC_BASE_URL = `${KIMI_LEGACY_OPENAI_BASE_URL}/anthropic`;
export const KIMI_DOMESTIC_ANTHROPIC_BASE_URL = `${KIMI_DOMESTIC_BASE_URL}/anthropic`;

export const KIMI_BASE_URL_OPTIONS = [
  {
    id: 'domestic',
    baseUrl: KIMI_DOMESTIC_OPENAI_BASE_URL,
    openaiBaseUrl: KIMI_DOMESTIC_OPENAI_BASE_URL,
    anthropicBaseUrl: KIMI_DOMESTIC_ANTHROPIC_BASE_URL,
  },
  {
    id: 'overseas',
    baseUrl: KIMI_OPENAI_BASE_URL,
    openaiBaseUrl: KIMI_OPENAI_BASE_URL,
    anthropicBaseUrl: KIMI_ANTHROPIC_BASE_URL,
  },
] as const;

const normalizeBaseUrl = (value: string | undefined | null): string =>
  String(value ?? '').trim().toLowerCase().replace(/\/+$/, '');

export const resolveKimiBaseUrl = (value: string | undefined | null): string => {
  const normalized = normalizeBaseUrl(value);
  const matched = KIMI_BASE_URL_OPTIONS.find(
    (option) =>
      normalized === normalizeBaseUrl(option.baseUrl) ||
      normalized === normalizeBaseUrl(option.openaiBaseUrl) ||
      normalized === normalizeBaseUrl(option.anthropicBaseUrl)
  );
  if (matched) return matched.baseUrl;
  if (normalized === normalizeBaseUrl(KIMI_LEGACY_OPENAI_BASE_URL)) return KIMI_OPENAI_BASE_URL;
  return KIMI_DOMESTIC_OPENAI_BASE_URL;
};

export const getKimiProtocolUrls = (value: string | undefined | null) => {
  const baseUrl = resolveKimiBaseUrl(value);
  const matched =
    KIMI_BASE_URL_OPTIONS.find((option) => normalizeBaseUrl(option.baseUrl) === normalizeBaseUrl(baseUrl)) ??
    KIMI_BASE_URL_OPTIONS[0];
  return { openai: matched.openaiBaseUrl, anthropic: matched.anthropicBaseUrl, codex: '', gemini: '' };
};

export const isKimiOpenAIProvider = (config: OpenAIProviderConfig | undefined | null): boolean => {
  if (!config) return false;
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  return (
    KIMI_BASE_URL_OPTIONS.some((option) => baseUrl === normalizeBaseUrl(option.openaiBaseUrl)) ||
    baseUrl === normalizeBaseUrl(KIMI_LEGACY_OPENAI_BASE_URL) ||
    baseUrl === normalizeBaseUrl(KIMI_DOMESTIC_BASE_URL)
  );
};

export const isKimiClaudeProvider = (config: ProviderKeyConfig | undefined | null): boolean => {
  if (!config) return false;
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  return KIMI_BASE_URL_OPTIONS.some((option) => baseUrl === normalizeBaseUrl(option.anthropicBaseUrl));
};

export interface KimiRaw {
  openai: Array<{ config: OpenAIProviderConfig; index: number }>;
  claude: Array<{ config: ProviderKeyConfig; index: number }>;
  codex: [];
  gemini: [];
}

export const buildKimiRaw = (config: Config | null | undefined): KimiRaw => ({
  openai: (config?.openaiCompatibility ?? [])
    .map((item, index) => ({ config: item, index }))
    .filter((item) => isKimiOpenAIProvider(item.config)),
  claude: (config?.claudeApiKeys ?? [])
    .map((item, index) => ({ config: item, index }))
    .filter((item) => isKimiClaudeProvider(item.config)),
  codex: [],
  gemini: [],
});
