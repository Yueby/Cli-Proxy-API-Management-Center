import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { SkeletonTextBlock } from '@/components/common/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { IconRefreshCw } from '@/components/ui/icons';
import {
  captureQuotaCacheGeneration,
  commitIfQuotaCacheCurrent,
  useNotificationStore,
  useQuotaStore,
} from '@/stores';
import type { AuthFileItem } from '@/types';
import {
  isRuntimeOnlyAuthFile,
  resolveQuotaErrorMessage,
  type QuotaProviderType,
} from '@/features/authFiles/constants';
import { getAuthFileQuotaConfig } from '@/features/authFiles/quotaConfig';
import { bindQuotaClasses } from '@/features/quota/types';
import styles from './AuthFileQuota.module.scss';

const compactQuotaClasses = bindQuotaClasses(styles, 'AuthFileQuota.module.scss');

type QuotaState =
  | { status?: 'idle' | 'loading' | 'success' | 'error'; error?: string; errorStatus?: number }
  | undefined;

type QuotaUpdater = (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;

const assertNever = (value: never): never => {
  throw new Error(`Unsupported quota type: ${value}`);
};

export type AuthFileQuotaSectionProps = {
  file: AuthFileItem;
  quotaType: QuotaProviderType;
  disableControls?: boolean;
};

export function AuthFileQuotaSection({
  file,
  quotaType,
  disableControls = false,
}: AuthFileQuotaSectionProps) {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const showConfirmation = useNotificationStore((state) => state.showConfirmation);
  const [resettingQuota, setResettingQuota] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const quota = useQuotaStore((state) => {
    if (quotaType === 'antigravity') return state.antigravityQuota[file.name] as QuotaState;
    if (quotaType === 'claude') return state.claudeQuota[file.name] as QuotaState;
    if (quotaType === 'codex') return state.codexQuota[file.name] as QuotaState;
    if (quotaType === 'kimi') return state.kimiQuota[file.name] as QuotaState;
    if (quotaType === 'xai') return state.xaiQuota[file.name] as QuotaState;
    return assertNever(quotaType);
  });

  const updateQuotaState = useQuotaStore((state) => {
    if (quotaType === 'antigravity') return state.setAntigravityQuota as unknown as QuotaUpdater;
    if (quotaType === 'claude') return state.setClaudeQuota as unknown as QuotaUpdater;
    if (quotaType === 'codex') return state.setCodexQuota as unknown as QuotaUpdater;
    if (quotaType === 'kimi') return state.setKimiQuota as unknown as QuotaUpdater;
    if (quotaType === 'xai') return state.setXaiQuota as unknown as QuotaUpdater;
    return assertNever(quotaType);
  });

  const config = getAuthFileQuotaConfig(quotaType);
  const quotaStatus = quota?.status ?? 'idle';
  const canRefreshQuota =
    !disableControls && !file.disabled && !isRuntimeOnlyAuthFile(file) && !resettingQuota;
  const canUseResetQuota = canRefreshQuota && quotaStatus !== 'loading';
  const showResetQuotaAction = quota !== undefined && Boolean(config.canResetQuota?.(quota));


  const resetQuotaForFile = useCallback(() => {
    if (!canUseResetQuota || !config.resetQuota) return;
    showConfirmation({
      title: t('codex_quota.reset_confirm_title'),
      message: t('codex_quota.reset_confirm_message', { name: file.name }),
      confirmText: t('codex_quota.reset_confirm_button'),
      variant: 'primary',
      onConfirm: async () => {
        const cacheGeneration = captureQuotaCacheGeneration();
        setResettingQuota(true);
        try {
          const data = await config.resetQuota!(file, t as TFunction);
          commitIfQuotaCacheCurrent(cacheGeneration, () => {
            updateQuotaState((prev) => ({ ...prev, [file.name]: config.buildSuccessState(data) }));
            showNotification(t('codex_quota.reset_success', { name: file.name }), 'success');
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : t('common.unknown_error');
          commitIfQuotaCacheCurrent(cacheGeneration, () => {
            showNotification(t('codex_quota.reset_failed', { name: file.name, message }), 'error');
          });
        } finally {
          setResettingQuota(false);
        }
      },
    });
  }, [canUseResetQuota, config, file, showConfirmation, showNotification, t, updateQuotaState]);

  const quotaErrorMessage = resolveQuotaErrorMessage(
    t,
    quota?.errorStatus,
    quota?.error || t('common.unknown_error')
  );

  return (
    <div className={styles.quotaSection} data-provider={quotaType}>
      {quotaStatus === 'idle' ? (
        <div className={styles.quotaMessage}>{t(`${config.i18nPrefix}.idle`)}</div>
      ) : quotaStatus === 'loading' ? (
        <div className={styles.quotaMessage} aria-busy="true" aria-label={t(`${config.i18nPrefix}.loading`)}>
          <SkeletonTextBlock lines={2} />
        </div>
      ) : quotaStatus === 'error' ? (
        <div className={styles.quotaError} title={quotaErrorMessage}>
          {t(`${config.i18nPrefix}.load_failed`, { message: quotaErrorMessage })}
        </div>
      ) : quota ? (
        <div className={styles.quotaDataArrival}>
          <config.Body quota={quota} classes={compactQuotaClasses} />
        </div>
      ) : null}

      {quotaStatus === 'success' && quota && (
        <details className={styles.quotaDetails} open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)}>
          <summary>{t('auth_files.quota.details')}</summary>
          <div className={styles.quotaTimelineEmpty} role="status">
            {t('auth_files.quota.timeline_empty')}
          </div>
        </details>
      )}

      {quotaStatus !== 'idle' && config.resetQuota && showResetQuotaAction && (
        <div className={styles.quotaCardActions}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={styles.quotaResetCreditButton}
            onClick={resetQuotaForFile}
            disabled={!canUseResetQuota}
            loading={resettingQuota}
            title={t('codex_quota.reset_button')}
            aria-label={t('codex_quota.reset_button')}
          >
            {!resettingQuota && <IconRefreshCw size={14} />}
            {t('codex_quota.reset_button')}
          </Button>
        </div>
      )}
    </div>
  );
}
