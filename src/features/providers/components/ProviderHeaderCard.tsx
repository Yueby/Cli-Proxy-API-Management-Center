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
  isFetching = false,
  isNewDisabled = false,
  newLabel,
  onRefresh,
  onNew,
}: ProviderHeaderCardProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.providerButtonGroup}>
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
        title={
          isFetching
            ? t('providersPage.actions.syncing')
            : t('providersPage.actions.refresh')
        }
      >
        <span className={`${styles.btnIcon} ${isFetching ? styles.spin : ''}`.trim()}>
          {isFetching ? <IconLoader2 size={14} /> : <IconRefreshCw size={14} />}
        </span>
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={onNew}
        disabled={isNewDisabled}
        aria-label={newLabel ?? t('providersPage.actions.new')}
        title={newLabel ?? t('providersPage.actions.new')}
      >
        <IconPlus size={14} />
      </Button>
    </div>
  );
}
