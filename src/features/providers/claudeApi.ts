import type { ProviderKeyConfig } from '@/types';

export const CLAUDE_API_DISPLAY_NAME = 'ClaudeAPI';
export const CLAUDE_API_BASE_URL = 'https://gw.claudeapi.com';

const normalizeBaseUrl = (value: string | undefined | null): string =>
  String(value ?? '').trim().toLowerCase().replace(/\/+$/, '');

export const isClaudeApiProvider = (config: ProviderKeyConfig | undefined | null): boolean =>
  Boolean(config) && normalizeBaseUrl(config?.baseUrl) === normalizeBaseUrl(CLAUDE_API_BASE_URL);