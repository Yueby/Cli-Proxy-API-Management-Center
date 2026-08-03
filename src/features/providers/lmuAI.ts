import type { Config, GeminiKeyConfig, OpenAIProviderConfig, ProviderKeyConfig } from '@/types';
import type { MultiProtocolProviderRaw } from './types';

export const LMU_AI_PROVIDER_NAME = 'lmuAI';
export const LMU_AI_DISPLAY_NAME = 'LMU AI（灵眸AI）';
export const LMU_AI_BASE_URL = 'https://api.lmuai.com';
export const LMU_AI_OPENAI_BASE_URL = `${LMU_AI_BASE_URL}/v1`;
export const LMU_AI_CODEX_BASE_URL = LMU_AI_OPENAI_BASE_URL;
export const LMU_AI_ANTHROPIC_BASE_URL = LMU_AI_BASE_URL;
export const LMU_AI_GEMINI_BASE_URL = LMU_AI_BASE_URL;

export const LMU_AI_BASE_URL_OPTIONS = [
  {
    id: 'standard',
    baseUrl: LMU_AI_BASE_URL,
    openaiBaseUrl: LMU_AI_OPENAI_BASE_URL,
    codexBaseUrl: LMU_AI_CODEX_BASE_URL,
    anthropicBaseUrl: LMU_AI_ANTHROPIC_BASE_URL,
    geminiBaseUrl: LMU_AI_GEMINI_BASE_URL,
  },
] as const;

export const LMU_AI_PROTOCOL_LABELS = [
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

export const resolveLmuAIBaseUrl = (value: string | undefined | null): string => {
  const normalized = normalizeBaseUrl(value);
  const matched = LMU_AI_BASE_URL_OPTIONS.find((option) =>
    [
      option.baseUrl,
      option.openaiBaseUrl,
      option.codexBaseUrl,
      option.anthropicBaseUrl,
      option.geminiBaseUrl,
    ].some((endpoint) => normalized === normalizeBaseUrl(endpoint))
  );
  return matched?.baseUrl ?? LMU_AI_BASE_URL;
};

export const getLmuAIProtocolUrls = (value: string | undefined | null) => {
  const baseUrl = resolveLmuAIBaseUrl(value);
  const matched =
    LMU_AI_BASE_URL_OPTIONS.find(
      (option) => normalizeBaseUrl(option.baseUrl) === normalizeBaseUrl(baseUrl)
    ) ?? LMU_AI_BASE_URL_OPTIONS[0];
  return {
    openai: matched.openaiBaseUrl,
    codex: matched.codexBaseUrl,
    anthropic: matched.anthropicBaseUrl,
    gemini: matched.geminiBaseUrl,
  };
};

const matchesEndpoint = (
  value: string | undefined | null,
  endpoint: string
): boolean => normalizeBaseUrl(value) === normalizeBaseUrl(endpoint);

export const isLmuAIOpenAIProvider = (
  config: OpenAIProviderConfig | undefined | null
): boolean => Boolean(config && matchesEndpoint(config.baseUrl, LMU_AI_OPENAI_BASE_URL));

export const isLmuAIClaudeProvider = (
  config: ProviderKeyConfig | undefined | null
): boolean => Boolean(config && matchesEndpoint(config.baseUrl, LMU_AI_ANTHROPIC_BASE_URL));

export const isLmuAICodexProvider = (
  config: ProviderKeyConfig | undefined | null
): boolean => Boolean(config && matchesEndpoint(config.baseUrl, LMU_AI_CODEX_BASE_URL));

export const isLmuAIGeminiProvider = (
  config: GeminiKeyConfig | undefined | null
): boolean => Boolean(config && matchesEndpoint(config.baseUrl, LMU_AI_GEMINI_BASE_URL));

export const buildLmuAIRaw = (
  config: Config | null | undefined
): MultiProtocolProviderRaw => ({
  openai: (config?.openaiCompatibility ?? [])
    .map((item, index) => ({ config: item, index }))
    .filter((item) => isLmuAIOpenAIProvider(item.config)),
  claude: (config?.claudeApiKeys ?? [])
    .map((item, index) => ({ config: item, index }))
    .filter((item) => isLmuAIClaudeProvider(item.config)),
  codex: (config?.codexApiKeys ?? [])
    .map((item, index) => ({ config: item, index }))
    .filter((item) => isLmuAICodexProvider(item.config)),
  gemini: (config?.geminiApiKeys ?? [])
    .map((item, index) => ({ config: item, index }))
    .filter((item) => isLmuAIGeminiProvider(item.config)),
});
