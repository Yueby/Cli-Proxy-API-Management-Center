import { describe, expect, test } from 'bun:test';
import en from '../src/i18n/locales/en.json';
import ru from '../src/i18n/locales/ru.json';
import zhCN from '../src/i18n/locales/zh-CN.json';
import zhTW from '../src/i18n/locales/zh-TW.json';

const locales = { en, ru, zhCN, zhTW } as const;
const providersRoot = new URL('../src/features/providers/', import.meta.url);

const getPath = (value: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);

const requiredKeys = new Set<string>();
const glob = new Bun.Glob('**/*.{ts,tsx}');
for await (const relativePath of glob.scan({ cwd: providersRoot.pathname })) {
  const source = await Bun.file(new URL(relativePath, providersRoot)).text();
  for (const match of source.matchAll(/\bt\(\s*['"](providersPage\.[^'"]+)['"]/g)) {
    requiredKeys.add(match[1]);
  }
}

const providerBrands = [
  'gemini', 'codex', 'claude', 'vertex', 'openaiCompatibility',
  'xai', 'kimi', 'claudeApi', 'code0', 'fennoAI', 'qiniuCloud',
];
const protocolLabels = ['openai', 'claude', 'codex', 'gemini', 'anthropic', 'codexResponses'];
const detailFields = [
  'identifier', 'baseUrl', 'proxyUrl', 'prefix', 'models', 'headers',
  'authIndex', 'excludedModels', 'apiKeyEntries',
];

providerBrands.forEach((brand) => requiredKeys.add(`providersPage.providerNames.${brand}`));
protocolLabels.forEach((protocol) => requiredKeys.add(`providersPage.protocols.${protocol}`));
detailFields.forEach((field) => requiredKeys.add(`providersPage.detail.fields.${field}`));

describe('provider i18n coverage', () => {
  for (const [localeName, locale] of Object.entries(locales)) {
    test(`${localeName} defines every provider translation key`, () => {
      const missing = [...requiredKeys].filter((path) => {
        const translated = getPath(locale, path);
        return typeof translated !== 'string' || translated.trim().length === 0 || translated === path;
      });
      expect(missing).toEqual([]);
    });
  }
});
