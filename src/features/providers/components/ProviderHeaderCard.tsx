import { useTranslation } from 'react-i18next';
import {
  IconLoader2,
  IconPlus,
  IconRefreshCw,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import styles from './ProviderHeaderCard.module.scss';

interface ProviderHeaderCardProps {
  totalActive: number;
  totalResources: number;
  providerFamilies: number;
  updatedAtLabel: string;
  issueCount?: number;
  isFetching?: boolean;
  isNewDisabled?: boolean;
  newLabel?: string;
  onRefresh: () => void;
  onNew: () => void;
}

export function ProviderHeaderCard({
  totalActive,
  totalResources,
  providerFamilies,
  updatedAtLabel,
  issueCount = 0,
  isFetching = false,
  isNewDisabled = false,
  newLabel,
  onRefresh,
  onNew,
}: ProviderHeaderCardProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.actions}>
      <div className={styles.summary}>
        <span>
          {t('providersPage.header.activeResources', {
            active: totalActive,
            total: totalResources,
          })}
        </span>
        <span>{t('providersPage.header.providerFamilies', { count: providerFamilies })}</span>
        <span>{t('providersPage.header.updatedAt', { time: updatedAtLabel })}</span>
        {issueCount > 0 ? (
          <span className={styles.issue}>
            {t('providersPage.header.issueCount', { count: issueCount })}
          </span>
        ) : null}
      </div>
      <div className={styles.buttonGroup}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          aria-label={
            isFetching
              ? t('providersPage.actions.syncing')
              : t('providersPage.actions.refresh')
          }
        >
          <span className={`${styles.btnIcon} ${isFetching ? styles.spin : ''}`.trim()}>
            {isFetching ? <IconLoader2 size={14} /> : <IconRefreshCw size={14} />}
          </span>
          <span>
            {isFetching
              ? t('providersPage.actions.syncing')
              : t('providersPage.actions.refresh')}
          </span>
        </Button>
        <Button variant="primary" size="sm" onClick={onNew} disabled={isNewDisabled}>
          <IconPlus size={14} />
          <span>{newLabel ?? t('providersPage.actions.new')}</span>
        </Button>
      </div>
    </div>
  );
}
