import type { MultiProtocolProviderRaw } from './types';

export type MultiProtocolAggregationConflict =
  | 'multiple-configs'
  | 'multiple-openai-keys';

export const getMultiProtocolAggregationConflict = (
  raw: MultiProtocolProviderRaw | null | undefined
): MultiProtocolAggregationConflict | null => {
  if (!raw) return null;
  if (
    raw.openai.length > 1 ||
    raw.claude.length > 1 ||
    raw.codex.length > 1 ||
    raw.gemini.length > 1
  ) {
    return 'multiple-configs';
  }

  const openAIKeyCount = raw.openai.reduce(
    (count, item) =>
      count + (item.config.apiKeyEntries ?? []).filter((entry) => entry.apiKey?.trim()).length,
    0
  );
  return openAIKeyCount > 1 ? 'multiple-openai-keys' : null;
};
