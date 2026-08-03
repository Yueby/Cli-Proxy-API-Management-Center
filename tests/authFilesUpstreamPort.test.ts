import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  getThemeSurfaceIconBackground,
  isThemeSurfaceIconProvider,
  supportsAuthFileManualRefresh,
} from '../src/features/authFiles/constants';
import { authFilesApi, buildManualRefreshExpiredAt } from '../src/services/api/authFiles';
import { apiClient } from '../src/services/api/client';

const originalPatch = apiClient.patch;
const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

afterEach(() => {
  apiClient.patch = originalPatch;
});

describe('Auth Files upstream compatibility port', () => {
  test('Kimi Auth Files icons use the theme-aware surface in ItemCard and filters', () => {
    expect(isThemeSurfaceIconProvider(' KIMI ')).toBeTrue();
    expect(isThemeSurfaceIconProvider('codex')).toBeFalse();
    expect(getThemeSurfaceIconBackground('light')).toBe('#000000');
    expect(getThemeSurfaceIconBackground('dark')).toBe('#ffffff');

    const card = source('src/features/authFiles/components/AuthFileCard.tsx');
    const page = source('src/pages/AuthFilesPage.tsx');
    expect(card).toContain('isThemeSurfaceIconProvider(providerKey)');
    expect(card).toContain('getThemeSurfaceIconBackground(resolvedTheme)');
    expect(page).toContain('isThemeSurfaceIconProvider(type)');
    expect(page).toContain('getThemeSurfaceIconBackground(resolvedTheme)');
  });

  test('manual refresh expires only supported OAuth credentials through the fields endpoint', async () => {
    for (const provider of ['antigravity', 'claude', 'codex', 'kimi', 'xai']) {
      expect(supportsAuthFileManualRefresh(provider)).toBeTrue();
    }
    expect(supportsAuthFileManualRefresh('gemini')).toBeFalse();
    expect(buildManualRefreshExpiredAt(Date.parse('2026-07-25T12:00:00.000Z'))).toBe(
      '2026-07-25T11:59:00.000Z'
    );

    const calls: Array<{ url: string; body: unknown }> = [];
    apiClient.patch = (async (url: string, body?: unknown) => {
      calls.push({ url, body });
      return {};
    }) as typeof apiClient.patch;

    await authFilesApi.requestManualRefresh('kimi.json');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('/auth-files/fields');
    expect(calls[0]?.body).toMatchObject({ name: 'kimi.json' });
    expect(Date.parse((calls[0]?.body as { expired: string }).expired)).toBeLessThan(Date.now());
  });

  test('manual refresh is wired through the existing AuthFileCard architecture', () => {
    const card = source('src/features/authFiles/components/AuthFileCard.tsx');
    const hook = source('src/features/authFiles/hooks/useAuthFilesData.ts');
    const page = source('src/pages/AuthFilesPage.tsx');
    expect(card).toContain('onManualRefresh(file)');
    expect(card).toContain("t('auth_files.manual_refresh_button')");
    expect(hook).toContain('authFilesApi.requestManualRefresh(name)');
    expect(page).toContain('onManualRefresh={handleManualRefresh}');
  });

  test('manual refresh copy exists in all four shipped locales', () => {
    for (const locale of ['en', 'ru', 'zh-CN', 'zh-TW']) {
      const messages = JSON.parse(source(`src/i18n/locales/${locale}.json`));
      for (const key of [
        'manual_refresh_button',
        'manual_refresh_requested',
        'manual_refresh_failed',
      ]) {
        const value = messages.auth_files[key];
        expect(typeof value).toBe('string');
        expect(value.trim()).not.toBe('');
      }
    }
  });

  test('Auth Files no longer exposes or persists the subscriptions-first toggle', () => {
    const page = source('src/pages/AuthFilesPage.tsx');
    const uiState = source('src/features/authFiles/uiState.ts');

    expect(page).not.toContain('codexSubscriptionFirst');
    expect(page).not.toContain('codex_subscription_first');
    expect(page).not.toContain('hasActiveCodexSubscription');
    expect(uiState).not.toContain('codexSubscriptionFirst');
    expect(uiState).not.toContain('codexNonFreeFirst');

    for (const locale of ['en', 'ru', 'zh-CN', 'zh-TW']) {
      const messages = JSON.parse(source(`src/i18n/locales/${locale}.json`));
      expect(messages.auth_files.codex_subscription_first).toBeUndefined();
    }
  });

  test('Auth Files display options use a compact multi-select dropdown', () => {
    const page = source('src/pages/AuthFilesPage.tsx');
    const multiSelect = source('src/components/ui/MultiSelect.tsx');

    expect(page).toContain("import { MultiSelect } from '@/components/ui/MultiSelect'");
    expect(page).toContain('<MultiSelect');
    expect(page).not.toContain('filterToggleGroup');
    expect(multiSelect).toContain('aria-multiselectable="true"');
    expect(multiSelect).toContain('SelectionCheckbox');
  });
});
