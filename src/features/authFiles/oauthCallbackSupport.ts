const CALLBACK_SUPPORTED = new Set<string>(['codex', 'anthropic', 'antigravity', 'xai']);

interface OAuthCallbackProvider {
  kind: 'builtin' | 'plugin';
  id: string;
}

export const supportsManualOAuthCallback = (
  provider: OAuthCallbackProvider,
  hasAuthorizationUrl: boolean
): boolean =>
  hasAuthorizationUrl && (provider.kind === 'plugin' || CALLBACK_SUPPORTED.has(provider.id));