import {
  FENNO_AI_BASE_URL_OPTIONS,
  FENNO_AI_DISPLAY_NAME,
  FENNO_AI_PROTOCOL_LABELS,
  FENNO_AI_PROVIDER_NAME,
  getFennoAIProtocolUrls,
  resolveFennoAIBaseUrl,
} from './fennoAI';
import {
  QINIU_CLOUD_BASE_URL_OPTIONS,
  QINIU_CLOUD_DISPLAY_NAME,
  QINIU_CLOUD_PROTOCOL_LABELS,
  QINIU_CLOUD_PROVIDER_NAME,
  getQiniuCloudProtocolUrls,
  resolveQiniuCloudBaseUrl,
} from './qiniuCloud';
import {
  LMU_AI_BASE_URL_OPTIONS,
  LMU_AI_DISPLAY_NAME,
  LMU_AI_PROTOCOL_LABELS,
  LMU_AI_PROVIDER_NAME,
  getLmuAIProtocolUrls,
  resolveLmuAIBaseUrl,
} from './lmuAI';
import {
  INFISTAR_BASE_URL_OPTIONS,
  INFISTAR_DISPLAY_NAME,
  INFISTAR_PROTOCOL_LABELS,
  INFISTAR_PROVIDER_NAME,
  getInfistarProtocolUrls,
  resolveInfistarBaseUrl,
} from './infistar';
import {
  KIMI_BASE_URL_OPTIONS,
  KIMI_DISPLAY_NAME,
  KIMI_PROTOCOL_LABELS,
  KIMI_PROVIDER_NAME,
  getKimiProtocolUrls,
  resolveKimiBaseUrl,
} from './kimi';
import type { MultiProtocolProviderBrand, MultiProtocolProviderProtocol } from './types';

export interface MultiProtocolUrls {
  anthropic: string;
  openai: string;
  codex: string;
  gemini: string;
}

export interface MultiProtocolBaseUrlOption {
  id: string;
  descriptionKey?: string;
  baseUrl: string;
  openaiBaseUrl: string;
  codexBaseUrl: string;
  anthropicBaseUrl: string;
  geminiBaseUrl?: string;
}

export interface MultiProtocolProviderDefinition {
  brand: MultiProtocolProviderBrand;
  displayName: string;
  providerName: string;
  protocols: readonly MultiProtocolProviderProtocol[];
  protocolLabels: readonly string[];
  defaultProtocol: MultiProtocolProviderProtocol;
  baseUrlOptions: readonly MultiProtocolBaseUrlOption[];
  resolveBaseUrl: (value: string | undefined | null) => string;
  getProtocolUrls: (value: string | undefined | null) => MultiProtocolUrls;
}

const DEFINITIONS: Record<MultiProtocolProviderBrand, MultiProtocolProviderDefinition> = {
  kimi: {
    brand: 'kimi',
    displayName: KIMI_DISPLAY_NAME,
    providerName: KIMI_PROVIDER_NAME,
    protocols: ['openai', 'claude', 'codex'],
    protocolLabels: KIMI_PROTOCOL_LABELS,
    defaultProtocol: 'openai',
    baseUrlOptions: KIMI_BASE_URL_OPTIONS,
    resolveBaseUrl: resolveKimiBaseUrl,
    getProtocolUrls: getKimiProtocolUrls,
  },
  fennoAI: {
    brand: 'fennoAI',
    displayName: FENNO_AI_DISPLAY_NAME,
    providerName: FENNO_AI_PROVIDER_NAME,
    protocols: ['codex', 'claude'],
    protocolLabels: FENNO_AI_PROTOCOL_LABELS,
    defaultProtocol: 'codex',
    baseUrlOptions: FENNO_AI_BASE_URL_OPTIONS,
    resolveBaseUrl: resolveFennoAIBaseUrl,
    getProtocolUrls: getFennoAIProtocolUrls,
  },
  qiniuCloud: {
    brand: 'qiniuCloud',
    displayName: QINIU_CLOUD_DISPLAY_NAME,
    providerName: QINIU_CLOUD_PROVIDER_NAME,
    protocols: ['openai', 'claude', 'gemini', 'codex'],
    protocolLabels: QINIU_CLOUD_PROTOCOL_LABELS,
    defaultProtocol: 'openai',
    baseUrlOptions: QINIU_CLOUD_BASE_URL_OPTIONS,
    resolveBaseUrl: resolveQiniuCloudBaseUrl,
    getProtocolUrls: getQiniuCloudProtocolUrls,
  },
  lmuAI: {
    brand: 'lmuAI',
    displayName: LMU_AI_DISPLAY_NAME,
    providerName: LMU_AI_PROVIDER_NAME,
    protocols: ['openai', 'claude', 'gemini', 'codex'],
    protocolLabels: LMU_AI_PROTOCOL_LABELS,
    defaultProtocol: 'openai',
    baseUrlOptions: LMU_AI_BASE_URL_OPTIONS,
    resolveBaseUrl: resolveLmuAIBaseUrl,
    getProtocolUrls: getLmuAIProtocolUrls,
  },
  infistar: {
    brand: 'infistar',
    displayName: INFISTAR_DISPLAY_NAME,
    providerName: INFISTAR_PROVIDER_NAME,
    protocols: ['openai', 'claude', 'gemini', 'codex'],
    protocolLabels: INFISTAR_PROTOCOL_LABELS,
    defaultProtocol: 'openai',
    baseUrlOptions: INFISTAR_BASE_URL_OPTIONS,
    resolveBaseUrl: resolveInfistarBaseUrl,
    getProtocolUrls: getInfistarProtocolUrls,
  },
};

export const isMultiProtocolProviderBrand = (brand: string): brand is MultiProtocolProviderBrand =>
  brand === 'kimi' || brand === 'fennoAI' || brand === 'qiniuCloud' || brand === 'lmuAI' || brand === 'infistar';

export const getMultiProtocolProviderDefinition = (
  brand: MultiProtocolProviderBrand
): MultiProtocolProviderDefinition => DEFINITIONS[brand];

export const multiProtocolUrl = (
  urls: MultiProtocolUrls,
  protocol: MultiProtocolProviderProtocol
): string => {
  if (protocol === 'claude') return urls.anthropic;
  return urls[protocol];
};
