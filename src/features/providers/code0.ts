import type { Config, GeminiKeyConfig, OpenAIProviderConfig, ProviderKeyConfig } from '@/types';
import type { SponsorProviderRaw } from './types';

export const CODE0_PROVIDER_NAME = 'code0';
export const CODE0_DISPLAY_NAME = 'Code0';
export const CODE0_BASE_URL = 'https://code0.ai';
export const CODE0_OPENAI_BASE_URL = `${CODE0_BASE_URL}/v1`;
export const CODE0_CODEX_BASE_URL = CODE0_OPENAI_BASE_URL;
export const CODE0_ANTHROPIC_BASE_URL = CODE0_BASE_URL;
export const CODE0_GEMINI_BASE_URL = CODE0_BASE_URL;
export const CODE0_PROTOCOL_LABELS = ['openai', 'anthropic', 'gemini', 'codexResponses'] as const;

const normalizeBaseUrl = (value: string | undefined | null): string =>
  String(value ?? '').trim().toLowerCase().replace(/\/+$/, '');

export const resolveCode0BaseUrl = (_value: string | undefined | null): string => CODE0_BASE_URL;
export const getCode0ProtocolUrls = (_value: string | undefined | null) => ({
  anthropic: CODE0_ANTHROPIC_BASE_URL,
  openai: CODE0_OPENAI_BASE_URL,
  codex: CODE0_CODEX_BASE_URL,
  gemini: CODE0_GEMINI_BASE_URL,
});

export const isCode0OpenAIProvider = (config: OpenAIProviderConfig | undefined | null): boolean =>
  Boolean(config) && normalizeBaseUrl(config?.baseUrl) === normalizeBaseUrl(CODE0_OPENAI_BASE_URL);
export const isCode0CodexProvider = (config: ProviderKeyConfig | undefined | null): boolean =>
  Boolean(config) && normalizeBaseUrl(config?.baseUrl) === normalizeBaseUrl(CODE0_CODEX_BASE_URL);
export const isCode0ClaudeProvider = (config: ProviderKeyConfig | undefined | null): boolean =>
  Boolean(config) &&
  normalizeBaseUrl(config?.baseUrl) === normalizeBaseUrl(CODE0_ANTHROPIC_BASE_URL) &&
  !isCode0CodexProvider(config);
export const isCode0GeminiProvider = (config: GeminiKeyConfig | undefined | null): boolean =>
  Boolean(config) && normalizeBaseUrl(config?.baseUrl) === normalizeBaseUrl(CODE0_GEMINI_BASE_URL);

export const buildCode0Raw = (config: Config | null | undefined): SponsorProviderRaw => ({
  openai: (config?.openaiCompatibility ?? []).map((item, index) => ({ config: item, index: item.sourceIndex ?? index })).filter((item) => isCode0OpenAIProvider(item.config)),
  claude: (config?.claudeApiKeys ?? []).map((item, index) => ({ config: item, index })).filter((item) => isCode0ClaudeProvider(item.config)),
  codex: (config?.codexApiKeys ?? []).map((item, index) => ({ config: item, index })).filter((item) => isCode0CodexProvider(item.config)),
  gemini: (config?.geminiApiKeys ?? []).map((item, index) => ({ config: item, index })).filter((item) => isCode0GeminiProvider(item.config)),
});