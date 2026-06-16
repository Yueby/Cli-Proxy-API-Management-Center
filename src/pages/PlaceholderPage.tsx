import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { SkeletonTextBlock } from '@/components/common/LoadingSkeleton';

export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();

  return (
    <Card title={t(titleKey)}>
      <div aria-busy="true" aria-label={t('common.loading')}>
        <SkeletonTextBlock lines={4} />
      </div>
    </Card>
  );
}
