import {
  ANTIGRAVITY_CONFIG,
  CLAUDE_CONFIG,
  CODEX_CONFIG,
  KIMI_CONFIG,
  XAI_CONFIG,
  type QuotaConfig,
} from '@/components/quota';
import type { AuthFileItem } from '@/types';
import { resolveAuthProvider } from '@/utils/quota';
import { QUOTA_PROVIDER_TYPES, type QuotaProviderType } from './constants';

type AnyQuotaConfig = QuotaConfig<unknown, unknown>;
const asAnyQuotaConfig = (config: unknown): AnyQuotaConfig => config as AnyQuotaConfig;

const assertNever = (value: never): never => {
  throw new Error(`Unsupported quota type: ${value}`);
};

export const getAuthFileQuotaConfig = (type: QuotaProviderType): AnyQuotaConfig => {
  if (type === 'antigravity') return asAnyQuotaConfig(ANTIGRAVITY_CONFIG);
  if (type === 'claude') return asAnyQuotaConfig(CLAUDE_CONFIG);
  if (type === 'codex') return asAnyQuotaConfig(CODEX_CONFIG);
  if (type === 'kimi') return asAnyQuotaConfig(KIMI_CONFIG);
  if (type === 'xai') return asAnyQuotaConfig(XAI_CONFIG);
  return assertNever(type);
};

export const resolveAuthFileQuotaType = (file: AuthFileItem): QuotaProviderType | null => {
  const provider = resolveAuthProvider(file);
  if (!QUOTA_PROVIDER_TYPES.has(provider as QuotaProviderType)) return null;
  return provider as QuotaProviderType;
};
