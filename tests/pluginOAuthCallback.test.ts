import { describe, expect, test } from 'bun:test';
import { supportsManualOAuthCallback } from '../src/features/authFiles/oauthCallbackSupport';

describe('plugin OAuth callback', () => {
  test('allows manual callbacks for dynamic plugin providers after authorization starts', () => {
    expect(supportsManualOAuthCallback({ kind: 'plugin', id: 'custom-oauth' }, true)).toBe(true);
  });

  test('does not show callback controls before an authorization URL exists', () => {
    expect(supportsManualOAuthCallback({ kind: 'plugin', id: 'custom-oauth' }, false)).toBe(false);
  });

  test('keeps callback support restricted for built-in providers', () => {
    expect(supportsManualOAuthCallback({ kind: 'builtin', id: 'codex' }, true)).toBe(true);
    expect(supportsManualOAuthCallback({ kind: 'builtin', id: 'kimi' }, true)).toBe(false);
  });
});