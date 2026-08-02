import type { AuthFileItem, Config } from '@/types';
import type { RecentRequestUsageEntry } from './recentRequests';
import { normalizeRecentRequestUsageEntry, sumRecentRequests } from './recentRequests';

export const getProviderKeyCounts = (config: Config) => ({
  gemini: config.geminiApiKeys?.length ?? 0,
  interactions: config.interactionsApiKeys?.length ?? 0,
  codex: config.codexApiKeys?.length ?? 0,
  xai: config.xaiApiKeys?.length ?? 0,
  claude: config.claudeApiKeys?.length ?? 0,
  vertex: config.vertexApiKeys?.length ?? 0,
  openai: config.openaiCompatibility?.length ?? 0,
});

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  'gemini-interactions': 'Interactions API',
  codex: 'Codex',
  claude: 'Claude',
  xai: 'xAI',
  vertex: 'Vertex AI',
  openai: 'OpenAI Compatible',
  'openai-compatibility': 'OpenAI Compatible',
};

export function providerLabel(id: string, unknownLabel: string): string {
  if (!id || id === 'unknown') return unknownLabel;
  return PROVIDER_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

export function getDashboardModelsStatValue(
  count: number,
  loading: boolean,
  error: string | null
): number | '-' {
  return loading || error ? '-' : count;
}

export interface DashboardTrafficMetrics {
  totalSuccess: number;
  totalFailure: number;
  total: number;
  successRate: number;
  throughputPerMinute: number;
  windowMinutes: 300;
}

export function buildDashboardTrafficMetrics(
  apiKeyUsage: Map<string, Map<string, RecentRequestUsageEntry>>,
  authFiles: AuthFileItem[]
): DashboardTrafficMetrics {
  let totalSuccess = 0;
  let totalFailure = 0;

  for (const providerUsage of apiKeyUsage.values()) {
    for (const usage of providerUsage.values()) {
      const totals = sumRecentRequests(usage.recentRequests);
      totalSuccess += totals.success;
      totalFailure += totals.failure;
    }
  }

  for (const file of authFiles) {
    // API-key entries are represented by the backend usage map; counting the
    // auth-file copy as well would duplicate the same traffic.
    if (file.account_type === 'api_key') continue;
    const usage = normalizeRecentRequestUsageEntry({
      success: file.success,
      failed: file.failed,
      recent_requests: file.recent_requests ?? file.recentRequests,
    });
    const totals = sumRecentRequests(usage.recentRequests);
    totalSuccess += totals.success;
    totalFailure += totals.failure;
  }

  const total = totalSuccess + totalFailure;
  return {
    totalSuccess,
    totalFailure,
    total,
    successRate: total > 0 ? (totalSuccess / total) * 100 : 100,
    throughputPerMinute: total / 300,
    windowMinutes: 300,
  };
}
