import { useTranslation } from 'react-i18next';
import { useNow } from '@/hooks/useNow';
import { SkeletonTextBlock } from '@/components/common/LoadingSkeleton';
import { useQuotaStore } from '@/stores';
import type { AuthFileItem } from '@/types';
import { resolveQuotaErrorMessage, type QuotaProviderType } from '@/features/authFiles/constants';
import { getAuthFileQuotaConfig } from '@/features/authFiles/quotaConfig';
import { QuotaProgressBar } from '@/features/authFiles/components/QuotaProgressBar';
import styles from '@/pages/AuthFilesPage.module.scss';

type QuotaState =
  | { status?: 'idle' | 'loading' | 'success' | 'error'; error?: string; errorStatus?: number }
  | undefined;

const assertNever = (value: never): never => {
  throw new Error(`Unsupported quota type: ${value}`);
};

export type AuthFileQuotaSectionProps = {
  file: AuthFileItem;
  quotaType: QuotaProviderType;
  disableControls?: boolean;
};

// Force reload
export function AuthFileQuotaSection({ file, quotaType }: AuthFileQuotaSectionProps) {
  const { t, i18n } = useTranslation();

  const quota = useQuotaStore((state) => {
    if (quotaType === 'antigravity') return state.antigravityQuota[file.name] as QuotaState;
    if (quotaType === 'claude') return state.claudeQuota[file.name] as QuotaState;
    if (quotaType === 'codex') return state.codexQuota[file.name] as QuotaState;
    if (quotaType === 'kimi') return state.kimiQuota[file.name] as QuotaState;
    if (quotaType === 'xai') return state.xaiQuota[file.name] as QuotaState;
    return assertNever(quotaType);
  });
  const nowMs = useNow(quota?.status === 'success');

  const config = getAuthFileQuotaConfig(quotaType);
  const quotaStatus = quota?.status ?? 'idle';
  const isLoading = quotaStatus === 'loading';
  const quotaErrorMessage = resolveQuotaErrorMessage(
    t,
    quota?.errorStatus,
    quota?.error || t('common.unknown_error')
  );

  const getQuotaItemsCount = (): number => {
    if (!quota || quotaStatus !== 'success') return 0;
    if (quotaType === 'antigravity') return (quota as { groups?: unknown[] }).groups?.length ?? 0;
    if (quotaType === 'claude') return (quota as { windows?: unknown[] }).windows?.length ?? 0;
    if (quotaType === 'codex') return (quota as { windows?: unknown[] }).windows?.length ?? 0;
    if (quotaType === 'kimi') return (quota as { rows?: unknown[] }).rows?.length ?? 0;
    if (quotaType === 'xai') return 1;
    return assertNever(quotaType);
  };

  if (quotaStatus === 'idle') return null;

  const itemsCount = getQuotaItemsCount();
  const gridClass = itemsCount <= 1 ? styles.quotaGridSingle : styles.quotaGrid;

  return (
    <div className={styles.quotaSection}>
      {quotaStatus === 'success' && quota ? (
        <div className={gridClass}>
          {config.renderQuotaItems(quota as never, t, {
            styles,
            QuotaProgressBar,
            nowMs,
            locale: i18n.resolvedLanguage || i18n.language,
          })}
        </div>
      ) : isLoading ? (
        <div
          className={styles.quotaMessage}
          aria-busy="true"
          aria-label={t(`${config.i18nPrefix}.loading`)}
        >
          <SkeletonTextBlock lines={2} />
        </div>
      ) : (
        <div className={styles.quotaError} title={quotaErrorMessage}>
          {t(`${config.i18nPrefix}.load_failed`, { message: quotaErrorMessage })}
        </div>
      )}
    </div>
  );
}
