import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import i18n from '@/i18n';
import { ApiKeyStrengthMeter } from '@/components/config/ApiKeyStrengthMeter';
import { generateSecureApiKey } from '@/utils/apiKey';

const LOCALES = ['en', 'zh-CN', 'zh-TW', 'ru'];

describe('ApiKeyStrengthMeter', () => {
  test('exposes the tier through the progressbar', () => {
    const markup = renderToStaticMarkup(
      createElement(ApiKeyStrengthMeter, { value: generateSecureApiKey() })
    );

    expect(markup).toContain('aria-valuenow="4"');
    expect(markup).toContain('aria-valuemax="4"');
    expect(markup).toContain(
      `aria-valuetext="${i18n.t('config_management.visual.api_keys.strength.strong')}"`
    );
    expect(markup.match(/data-filled="true"/g)).toHaveLength(4);
  });

  test('empty input lights nothing and shows a placeholder label', () => {
    const markup = renderToStaticMarkup(createElement(ApiKeyStrengthMeter, { value: '' }));

    expect(markup).toContain('aria-valuenow="0"');
    expect(markup).not.toContain('data-filled="true"');
    expect(markup).toContain('—');
  });

  test('is rendered beside the reachable visual config API key input', () => {
    const blocks = readFileSync(
      resolve(import.meta.dir, '../src/components/config/VisualConfigEditorBlocks.tsx'),
      'utf8'
    );

    expect(blocks).toContain("import { ApiKeyStrengthMeter } from './ApiKeyStrengthMeter'");
    expect(blocks).toContain('<ApiKeyStrengthMeter value={inputValue} />');
  });

  test('every tier label is translated in all locales', async () => {
    const original = i18n.language;

    for (const locale of LOCALES) {
      await i18n.changeLanguage(locale);
      for (const key of ['label', 'empty', 'weak', 'fair', 'good', 'strong']) {
        const path = `config_management.visual.api_keys.strength.${key}`;
        expect(i18n.exists(path)).toBe(true);
        expect(i18n.t(path)).not.toBe(path);
      }
      expect(i18n.exists('config_management.visual.api_keys.generate_failed')).toBe(true);
      expect(i18n.t('config_management.visual.api_keys.generate_failed')).not.toBe(
        'config_management.visual.api_keys.generate_failed'
      );
    }

    await i18n.changeLanguage(original);
  });
});
