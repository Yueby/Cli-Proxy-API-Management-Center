import { describe, expect, test } from 'bun:test';
import {
  CONFIG_FIELD_SEARCH_INDEX,
  configFieldDomId,
  getFieldRevealPatch,
  searchConfigFields,
} from '../src/components/config/configSearchIndex';

const editorSource = await Bun.file(
  new URL('../src/components/config/VisualConfigEditor.tsx', import.meta.url)
).text();

const translations: Record<string, string> = {
  'config_management.visual.sections.server.host': 'Host',
  'config_management.visual.sections.server.port': 'Port',
  'config_management.visual.sections.network.proxy_url': 'Proxy URL',
  'config_management.visual.sections.headers.user_agent': 'User-Agent',
  'config_management.visual.sections.headers.claude_title': 'Claude headers',
  'config_management.visual.sections.headers.codex_title': 'Codex headers',
};
const t = (key: string) => translations[key] ?? key;

describe('visual config field search index', () => {
  test('matches translated labels and stable YAML aliases with useful ranking', () => {
    expect(searchConfigFields('pro', t).map((entry) => entry.fieldId)[0]).toBe('proxyUrl');
    expect(searchConfigFields('proxy-url', t).map((entry) => entry.fieldId)).toContain('proxyUrl');
  });

  test('uses translated qualifiers to disambiguate duplicate field labels', () => {
    expect(searchConfigFields('claude', t).map((entry) => entry.fieldId)).toContain(
      'claudeHeaderUserAgent'
    );
    expect(searchConfigFields('codex', t).map((entry) => entry.fieldId)).toContain(
      'codexHeaderUserAgent'
    );
  });

  test('keeps field anchors stable and indexes only sections present in the fork editor', () => {
    expect(configFieldDomId('proxyUrl')).toBe('cfg-field-proxyUrl');
    expect(new Set(CONFIG_FIELD_SEARCH_INDEX.map((entry) => entry.sectionId))).toEqual(
      new Set(['server', 'tls', 'remote', 'auth', 'system', 'network', 'quota', 'streaming', 'payload'])
    );
  });

  test('reveals conditional TLS fields before jumping to their anchors', () => {
    expect(getFieldRevealPatch('tlsCert')).toEqual({ tlsEnable: true });
    expect(getFieldRevealPatch('proxyUrl')).toBeUndefined();
  });

  test('integrates search into the fork editor without replacing its drawer navigation', () => {
    expect(editorSource).toContain('className={styles.sidebarDrawer}');
    expect(editorSource).toContain('searchConfigFields(searchQuery, t)');
    expect(editorSource).toContain('<FieldAnchor fieldId="tlsCert">');
    expect(editorSource).toContain('getFieldRevealPatch(entry.fieldId)');
  });
});
