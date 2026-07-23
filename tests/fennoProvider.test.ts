import { describe, expect, test } from 'bun:test';
import {
  buildFennoAIRaw,
  FENNO_AI_CODEX_BASE_URL,
} from '../src/features/providers/fennoAI';
import { getMultiProtocolProviderDefinition } from '../src/features/providers/multiProtocolDefinitions';

describe('FennoAI provider aggregation', () => {
  test('does not claim OpenAI configs that its form cannot display', () => {
    const raw = buildFennoAIRaw({
      openaiCompatibility: [
        {
          name: 'fennoAI',
          baseUrl: FENNO_AI_CODEX_BASE_URL,
          apiKeyEntries: [{ apiKey: 'openai-key' }],
        },
      ],
      codexApiKeys: [{ apiKey: 'codex-key', baseUrl: FENNO_AI_CODEX_BASE_URL }],
    });

    expect(getMultiProtocolProviderDefinition('fennoAI').protocols).toEqual(['codex', 'claude']);
    expect(raw.openai).toEqual([]);
    expect(raw.codex.map((item) => item.index)).toEqual([0]);
  });
});
