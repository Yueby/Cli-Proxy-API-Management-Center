import {
  KIMI_BASE_URL_OPTIONS,
  KIMI_DISPLAY_NAME,
  KIMI_PROVIDER_NAME,
  getKimiProtocolUrls,
  resolveKimiBaseUrl,
} from './kimi';

export interface ProviderProtocolDefinition {
  brand: 'kimi';
  displayName: string;
  providerName: string;
  protocols: readonly ['openai', 'claude'];
  baseUrlOptions: typeof KIMI_BASE_URL_OPTIONS;
  resolveBaseUrl: typeof resolveKimiBaseUrl;
  getProtocolUrls: typeof getKimiProtocolUrls;
}

const DEFINITIONS: Record<'kimi', ProviderProtocolDefinition> = {
  kimi: {
    brand: 'kimi',
    displayName: KIMI_DISPLAY_NAME,
    providerName: KIMI_PROVIDER_NAME,
    protocols: ['openai', 'claude'],
    baseUrlOptions: KIMI_BASE_URL_OPTIONS,
    resolveBaseUrl: resolveKimiBaseUrl,
    getProtocolUrls: getKimiProtocolUrls,
  },
};

/** Multi-protocol provider metadata; the legacy name is retained for API compatibility. */
export const getSponsorProviderDefinition = (brand: 'kimi'): ProviderProtocolDefinition =>
  DEFINITIONS[brand];
