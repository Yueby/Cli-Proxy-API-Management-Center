import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { IconChevronLeft } from './icons';
import styles from './Pagination.module.scss';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
  onPageChange?: (page: number) => void;
  className?: string;
}

/**
 * Generate page numbers with ellipsis.
 * Shows: first, last, current ± siblings, with '...' gaps.
 */
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];
  const siblings = 1;
  const left = Math.max(2, current - siblings);
  const right = Math.min(total - 1, current + siblings);

  pages.push(1);
  if (left > 2) pages.push('...');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('...');
  pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPrev,
  onNext,
  onPageChange,
  className,
}: PaginationProps) {
  const { t } = useTranslation();
  const [jumpInput, setJumpInput] = useState('');

  const pageNumbers = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages]);

  const handleJump = () => {
    const page = parseInt(jumpInput, 10);
    if (Number.isFinite(page) && page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange?.(page);
    }
    setJumpInput('');
  };

  const goToPage = (page: number) => {
    if (page === currentPage) return;
    if (page < currentPage) {
      // Navigate backwards
      let steps = currentPage - page;
      while (steps-- > 0) onPrev();
    } else {
      let steps = page - currentPage;
      while (steps-- > 0) onNext();
    }
  };

  const handlePageClick = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      goToPage(page);
    }
  };

  const rootClass = className ? `${styles.pagination} ${className}` : styles.pagination;

  return (
    <div className={rootClass}>
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

      <div className={styles.pageNumbers}>
        {pageNumbers.map((item, idx) =>
          item === '...' ? (
            <span key={`ellipsis-${idx}`} className={styles.ellipsis}>…</span>
          ) : (
            <button
              key={item}
              type="button"
              className={`${styles.pageButton} ${item === currentPage ? styles.pageButtonActive : ''}`}
              onClick={() => handlePageClick(item)}
              aria-current={item === currentPage ? 'page' : undefined}
            >
              {item}
            </button>
          )
        )}
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={currentPage >= totalPages}
        title={t('auth_files.pagination_next')}
        aria-label={t('auth_files.pagination_next')}
      >
        <IconChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
      </Button>

      {totalPages > 5 && (
        <div className={styles.jumpSection}>
          <input
            className={styles.jumpInput}
            type="number"
            min={1}
            max={totalPages}
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJump(); }}
            onBlur={handleJump}
            placeholder={String(currentPage)}
            aria-label={t('auth_files.pagination_jump', { defaultValue: 'Go to page' })}
          />
          <span className={styles.jumpTotal}>/ {totalPages}</span>
        </div>
      )}

      <span className={styles.pageInfo}>
        {t('auth_files.pagination_total_items', {
          count: totalItems,
          defaultValue: '{{count}} 项',
        })}
      </span>
    </div>
  );
}
