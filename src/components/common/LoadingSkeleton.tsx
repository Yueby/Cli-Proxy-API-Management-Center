import { Skeleton } from '@/components/ui/Skeleton';
import styles from './LoadingSkeleton.module.scss';

const cls = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export function SkeletonTextBlock({ lines = 4, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={cls(styles.textBlock, className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          height={14}
          rounded={6}
          className={cls(styles.textLine, index === lines - 1 && styles.textLineShort)}
        />
      ))}
    </div>
  );
}

export function SkeletonRows({
  count = 4,
  withAvatar = true,
  withActions = true,
  className = '',
}: {
  count?: number;
  withAvatar?: boolean;
  withActions?: boolean;
  className?: string;
}) {
  return (
    <div className={cls(styles.rowList, className)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.row}>
          {withAvatar ? <Skeleton width={36} height={36} rounded={10} /> : null}
          <div className={styles.rowMain}>
            <Skeleton height={14} rounded={6} className={styles.rowTitle} />
            <Skeleton height={12} rounded={6} className={styles.rowSubtitle} />
          </div>
          {withActions ? <Skeleton width={74} height={30} rounded={8} className={styles.rowAction} /> : null}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 6, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={cls(styles.cardGrid, className)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.card}>
          <div className={styles.cardHeader}>
            <Skeleton width={40} height={40} rounded={10} />
            <div className={styles.cardTitleGroup}>
              <Skeleton height={14} rounded={6} className={styles.cardTitle} />
              <Skeleton height={12} rounded={6} className={styles.cardSubtitle} />
            </div>
          </div>
          <div className={styles.pillRow}>
            <Skeleton width={72} height={24} rounded={999} />
            <Skeleton width={96} height={24} rounded={999} />
            <Skeleton width={58} height={24} rounded={999} />
          </div>
          <Skeleton height={72} rounded={10} className={styles.cardBody} />
          <div className={styles.cardActions}>
            <Skeleton width={36} height={30} rounded={8} />
            <Skeleton width={36} height={30} rounded={8} />
            <Skeleton width={36} height={30} rounded={8} />
          </div>
        </div>
      ))}
    </div>
  );
}
