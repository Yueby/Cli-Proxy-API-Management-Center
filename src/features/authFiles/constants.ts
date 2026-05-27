import type { TFunction } from 'i18next';
import iconAntigravity from '@/assets/icons/antigravity.svg';
import iconClaude from '@/assets/icons/claude.svg';
import iconCodex from '@/assets/icons/codex.svg';
import iconGemini from '@/assets/icons/gemini.svg';
import iconGrok from '@/assets/icons/grok.svg';
import iconGrokDark from '@/assets/icons/grok-dark.svg';
import iconIflow from '@/assets/icons/iflow.svg';
import iconKimiDark from '@/assets/icons/kimi-dark.svg';
import iconKimiLight from '@/assets/icons/kimi-light.svg';
import iconQwen from '@/assets/icons/qwen.svg';
import iconVertex from '@/assets/icons/vertex.svg';
import type { AuthFileItem } from '@/types';
import { parseTimestamp } from '@/utils/timestamp';

export type ThemeColors = { bg: string; text: string; border?: string };
export type TypeColorSet = { light: ThemeColors; dark?: ThemeColors };
export type ResolvedTheme = 'light' | 'dark';
export type AuthFileModelItem = {
  id: string;
  display_name?: string;
  type?: string;
  owned_by?: string;
};
export type AuthFileIconAsset = string | { light: string; dark: string };

export type QuotaProviderType = 'antigravity' | 'claude' | 'codex' | 'gemini-cli' | 'kimi' | 'xai';

export const QUOTA_PROVIDER_TYPES = new Set<QuotaProviderType>([
  'antigravity',
  'claude',
  'codex',
  'gemini-cli',
  'kimi',
  'xai',
]);

export const MIN_CARD_PAGE_SIZE = 3;
export const MAX_CARD_PAGE_SIZE = 30;
export const AUTH_FILE_REFRESH_WARNING_MS = 24 * 60 * 60 * 1000;

export const INTEGER_STRING_PATTERN = /^[+-]?\d+$/;
export const TRUTHY_TEXT_VALUES = new Set(['true', '1', 'yes', 'y', 'on']);
export const FALSY_TEXT_VALUES = new Set(['false', '0', 'no', 'n', 'off']);

// 标签类型颜色配置 — 统一低饱和 graphite 风格，融合微弱的品牌色偏
export const TYPE_COLORS: Record<string, TypeColorSet> = {
  qwen: {
    light: { bg: '#f1f0f7', text: '#4e4376', border: '1px solid #e1dee9' },
    dark: { bg: '#292831', text: '#d0ccdb', border: '1px solid #3f3d4c' },
  },
  kimi: {
    light: { bg: '#ecf1f6', text: '#2c4a6f', border: '1px solid #d9e2ea' },
    dark: { bg: '#242a32', text: '#cbd5e1', border: '1px solid #3b4452' },
  },
  gemini: {
    light: { bg: '#ecf1f7', text: '#2a4c7e', border: '1px solid #dae3ee' },
    dark: { bg: '#232a35', text: '#cbd6e2', border: '1px solid #3a4454' },
  },
  'gemini-cli': {
    light: { bg: '#ecf1f7', text: '#2a4c7e', border: '1px solid #dae3ee' },
    dark: { bg: '#232a35', text: '#cbd6e2', border: '1px solid #3a4454' },
  },
  aistudio: {
    light: { bg: '#eff1f3', text: '#3f454d', border: '1px solid #dee1e5' },
    dark: { bg: '#282b30', text: '#d1d4d9', border: '1px solid #3e4249' },
  },
  claude: {
    light: { bg: '#f4f0ec', text: '#6b4c35', border: '1px solid #e7dfda' },
    dark: { bg: '#2d2925', text: '#ded6cf', border: '1px solid #48413b' },
  },
  codex: {
    light: { bg: '#eff0f6', text: '#3c4281', border: '1px solid #dfdef0' },
    dark: { bg: '#262833', text: '#d1d3df', border: '1px solid #3e404f' },
  },
  antigravity: {
    light: { bg: '#ebf3f3', text: '#215357', border: '1px solid #d6e5e5' },
    dark: { bg: '#202c2d', text: '#ccd9da', border: '1px solid #344446' },
  },
  xai: {
    light: { bg: '#eef0f2', text: '#343a40', border: '1px solid #d9dde2' },
    dark: { bg: '#2a2d31', text: '#d7dbe0', border: '1px solid #444950' },
  },
  iflow: {
    light: { bg: '#f4eff6', text: '#5f3c83', border: '1px solid #e8def1' },
    dark: { bg: '#2c2532', text: '#d8cbe2', border: '1px solid #433c4f' },
  },
  vertex: {
    light: { bg: '#edf1f5', text: '#324e75', border: '1px solid #dae1ea' },
    dark: { bg: '#242a31', text: '#cbd4df', border: '1px solid #3b434e' },
  },
  empty: {
    light: { bg: '#f5f5f5', text: '#616161' },
    dark: { bg: '#424242', text: '#bdbdbd' },
  },
  unknown: {
    light: { bg: '#f0f0f0', text: '#666666', border: '1px dashed #999999' },
    dark: { bg: '#3a3a3a', text: '#aaaaaa', border: '1px dashed #666666' },
  },
};

export const AUTH_FILE_ICONS: Record<string, AuthFileIconAsset> = {
  antigravity: iconAntigravity,
  aistudio: iconGemini,
  claude: iconClaude,
  codex: iconCodex,
  gemini: iconGemini,
  'gemini-cli': iconGemini,
  xai: { light: iconGrok, dark: iconGrokDark },
  iflow: iconIflow,
  kimi: { light: iconKimiLight, dark: iconKimiDark },
  qwen: iconQwen,
  vertex: iconVertex,
};

export const clampCardPageSize = (value: number) =>
  Math.min(MAX_CARD_PAGE_SIZE, Math.max(MIN_CARD_PAGE_SIZE, Math.round(value)));

export const resolveQuotaErrorMessage = (
  t: TFunction,
  status: number | undefined,
  fallback: string
): string => {
  if (status === 404) return t('common.quota_update_required');
  if (status === 403) return t('common.quota_check_credential');
  return fallback;
};

export const normalizeProviderKey = (value: string) => {
  const key = value.trim().toLowerCase().replace(/_/g, '-');
  if (key === 'x-ai' || key === 'grok') return 'xai';
  return key;
};

export const getAuthFileStatusMessage = (file: AuthFileItem): string => {
  const raw = file['status_message'] ?? file.statusMessage;
  if (typeof raw === 'string') return raw.trim();
  if (raw == null) return '';
  return String(raw).trim();
};

export const hasAuthFileStatusMessage = (file: AuthFileItem): boolean =>
  getAuthFileStatusMessage(file).length > 0;

export const getTypeLabel = (t: TFunction, type: string): string => {
  const providerKey = normalizeProviderKey(type);
  const key = `auth_files.filter_${providerKey}`;
  const translated = t(key);
  if (translated !== key) return translated;
  if (providerKey === 'iflow') return 'iFlow';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export const getTypeColor = (type: string, resolvedTheme: ResolvedTheme): ThemeColors => {
  const set = TYPE_COLORS[normalizeProviderKey(type)] || TYPE_COLORS.unknown;
  return resolvedTheme === 'dark' && set.dark ? set.dark : set.light;
};

export const getAuthFileIcon = (type: string, resolvedTheme: ResolvedTheme): string | null => {
  const iconEntry = AUTH_FILE_ICONS[normalizeProviderKey(type)];
  if (!iconEntry) return null;
  return typeof iconEntry === 'string'
    ? iconEntry
    : resolvedTheme === 'dark'
      ? iconEntry.dark
      : iconEntry.light;
};

export const parsePriorityValue = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : undefined;
  }

  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || !INTEGER_STRING_PATTERN.test(trimmed)) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
};

export const normalizeExcludedModels = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];
  value.forEach((entry) => {
    const model = String(entry ?? '')
      .trim()
      .toLowerCase();
    if (!model || seen.has(model)) return;
    seen.add(model);
    normalized.push(model);
  });

  return normalized.sort((a, b) => a.localeCompare(b));
};

export const parseExcludedModelsText = (value: string): string[] =>
  normalizeExcludedModels(value.split(/[\n,]+/));

export const parseDisableCoolingValue = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (TRUTHY_TEXT_VALUES.has(normalized)) return true;
  if (FALSY_TEXT_VALUES.has(normalized)) return false;
  return undefined;
};

export const readCodexAuthFileWebsockets = (value: Record<string, unknown>): boolean =>
  parseDisableCoolingValue(value.websockets ?? value.websocket) ?? false;

export const applyCodexAuthFileWebsockets = (
  value: Record<string, unknown>,
  websockets: boolean
): Record<string, unknown> => {
  const next = { ...value };
  delete next.websocket;
  next.websockets = websockets;
  return next;
};

export function isRuntimeOnlyAuthFile(file: AuthFileItem): boolean {
  const raw = file['runtime_only'] ?? file.runtimeOnly;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.trim().toLowerCase() === 'true';
  return false;
}

export const formatModified = (item: AuthFileItem): string => {
  const raw = item['modtime'] ?? item.modified;
  if (!raw) return '-';
  const asNumber = Number(raw);
  const date =
    Number.isFinite(asNumber) && !Number.isNaN(asNumber)
      ? new Date(asNumber < 1e12 ? asNumber * 1000 : asNumber)
      : (parseTimestamp(raw) ?? new Date(String(raw)));
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

// 检查模型是否被 OAuth 排除
export const isModelExcluded = (
  modelId: string,
  providerType: string,
  excluded: Record<string, string[]>
): boolean => {
  const providerKey = normalizeProviderKey(providerType);
  const excludedModels = excluded[providerKey] || excluded[providerType] || [];
  return excludedModels.some((pattern) => {
    if (pattern.includes('*')) {
      // 支持通配符匹配：先转义正则特殊字符，再将 * 视为通配符
      const regexSafePattern = pattern
        .split('*')
        .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*');
      const regex = new RegExp(`^${regexSafePattern}$`, 'i');
      return regex.test(modelId);
    }
    return pattern.toLowerCase() === modelId.toLowerCase();
  });
};
