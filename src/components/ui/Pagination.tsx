import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { IconChevronLeft, IconChevronRight } from './icons';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPrev,
  onNext,
  className,
}: PaginationProps) {
  const { t } = useTranslation();

  return (
    <div className={className} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      <Button
        variant="secondary"
        size="sm"
        onClick={onPrev}
        disabled={currentPage <= 1}
        title={t('auth_files.pagination_prev')}
        aria-label={t('auth_files.pagination_prev')}
      >
        <IconChevronLeft size={16} />
      </Button>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '4px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
        {t('auth_files.pagination_info', {
          current: currentPage,
          total: totalPages,
          count: totalItems,
        })}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={currentPage >= totalPages}
        title={t('auth_files.pagination_next')}
        aria-label={t('auth_files.pagination_next')}
      >
        <IconChevronRight size={16} />
      </Button>
    </div>
  );
}
