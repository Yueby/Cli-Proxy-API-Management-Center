import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ANTIGRAVITY_CONFIG,
  CLAUDE_CONFIG,
  CODEX_CONFIG,
  GEMINI_CLI_CONFIG,
  KIMI_CONFIG,
} from '@/components/quota';
import { useQuotaStore } from '@/stores';
import type { AuthFileItem } from '@/types';
import type { QuotaProviderType } from '@/features/authFiles/constants';
import { QuotaProgressBar } from '@/features/authFiles/components/QuotaProgressBar';
import styles from '@/pages/AuthFilesPage.module.scss';

type QuotaState = { status?: string } | undefined;

const getQuotaConfig = (type: QuotaProviderType) => {
  if (type === 'antigravity') return ANTIGRAVITY_CONFIG;
  if (type === 'claude') return CLAUDE_CONFIG;
  if (type === 'codex') return CODEX_CONFIG;
  if (type === 'kimi') return KIMI_CONFIG;
  return GEMINI_CLI_CONFIG;
};

export type AuthFileQuotaSectionProps = {
  file: AuthFileItem;
  quotaType: QuotaProviderType;
};

/**
 * 只读 — 从全局 quota store 里读取该账号的缓存配额数据。
 * 仅当存在 success 状态的缓存时才渲染;loading / error / idle 一律不渲染,
 * 保持认证文件卡片干净。所有拉取逻辑都发生在配额管理页面,这里不发任何请求。
 */
export function AuthFileQuotaSection(props: AuthFileQuotaSectionProps) {
  const { file, quotaType } = props;
  const { t } = useTranslation();

  const quota = useQuotaStore((state) => {
    if (quotaType === 'antigravity') return state.antigravityQuota[file.name] as QuotaState;
    if (quotaType === 'claude') return state.claudeQuota[file.name] as QuotaState;
    if (quotaType === 'codex') return state.codexQuota[file.name] as QuotaState;
    if (quotaType === 'kimi') return state.kimiQuota[file.name] as QuotaState;
    return state.geminiCliQuota[file.name] as QuotaState;
  });

  if (!quota || quota.status !== 'success') return null;

  const config = getQuotaConfig(quotaType);

  return (
    <div className={styles.quotaSection}>
      {config.renderQuotaItems(quota as never, t, { styles, QuotaProgressBar }) as ReactNode}
    </div>
  );
}
