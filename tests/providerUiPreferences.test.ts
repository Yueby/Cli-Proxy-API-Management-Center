import { describe, expect, test } from 'bun:test';
import { PROVIDER_BRAND_ORDER } from '../src/features/providers/descriptors';
import en from '../src/i18n/locales/en.json';
import ru from '../src/i18n/locales/ru.json';
import zhCN from '../src/i18n/locales/zh-CN.json';
import zhTW from '../src/i18n/locales/zh-TW.json';

const originalOrder = ['gemini', 'codex', 'claude', 'vertex', 'openaiCompatibility'];
const addedProviders = [
  'xai',
  'kimi',
  'claudeApi',
  'code0',
  'fennoAI',
  'qiniuCloud',
  'lmuAI',
  'interactions',
];
const locales = { en, ru, zhCN, zhTW } as const;

const getPath = (value: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);

describe('provider UI preferences', () => {
  test('keeps the original provider order first and appends new providers', () => {
    expect(PROVIDER_BRAND_ORDER).toEqual([...originalOrder, ...addedProviders]);
  });

  test('defines provider names and multi-protocol form translations in every locale', () => {
    const requiredPaths = [
      ...addedProviders.map((brand) => `providersPage.providerNames.${brand}`),
      'providersPage.protocols.openai',
      'providersPage.protocols.claude',
      'providersPage.protocols.codex',
      'providersPage.protocols.gemini',
      'providersPage.multiProtocol.description',
      'providersPage.multiProtocol.protocol',
      'providersPage.multiProtocol.endpoint',
      'providersPage.multiProtocol.addProtocol',
    ];

    for (const locale of Object.values(locales)) {
      for (const path of requiredPaths) {
        const translated = getPath(locale, path);
        expect(typeof translated).toBe('string');
        expect(translated).not.toBe(path);
        expect((translated as string).trim().length).toBeGreaterThan(0);
      }
    }
  });
});
