import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPencil, IconTrash2 } from '@/components/ui/icons';

interface ProviderListProps<T> {
  items: T[];
  loading: boolean;
  keyField: (item: T, index: number) => string;
  renderContent: (item: T, index: number) => ReactNode;
  onEdit: (item: T, index: number) => void;
  onDelete: (item: T, index: number) => void;
  emptyTitle: string;
  emptyDescription: string;
  deleteLabel?: string;
  actionsDisabled?: boolean;
  getRowDisabled?: (item: T, index: number) => boolean;
  renderExtraActions?: (item: T, index: number) => ReactNode;
  listClassName?: string;
  rowClassName?: string;
  rowDisabledClassName?: string;
  metaClassName?: string;
  actionsClassName?: string;
}

export function ProviderList<T>({
  items,
  loading,
  keyField,
  renderContent,
  onEdit,
  onDelete,
  emptyTitle,
  emptyDescription,
  actionsDisabled = false,
  getRowDisabled,
  renderExtraActions,
  listClassName,
  rowClassName,
  rowDisabledClassName,
  metaClassName,
  actionsClassName,
}: ProviderListProps<T>) {
  const { t } = useTranslation();

  if (loading && items.length === 0) {
    return <div className="hint">{t('common.loading')}</div>;
  }

  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={listClassName ?? 'item-list'}>
      {items
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          if (!getRowDisabled) return 0;
          const aDisabled = getRowDisabled(a.item, a.index) ? 1 : 0;
          const bDisabled = getRowDisabled(b.item, b.index) ? 1 : 0;
          return aDisabled - bDisabled;
        })
        .map(({ item, index }) => {
        const rowDisabled = getRowDisabled ? getRowDisabled(item, index) : false;
        const rowClass = [
          rowClassName ?? 'item-row',
          rowDisabled ? (rowDisabledClassName ?? '') : '',
        ].filter(Boolean).join(' ');

        return (
          <div
            key={keyField(item, index)}
            className={rowClass}
          >
            <div className={actionsClassName ?? 'item-actions'}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item, index)}
                disabled={actionsDisabled}
                title={t('common.edit')}
                aria-label={t('common.edit')}
              >
                <IconPencil size={15} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item, index)}
                disabled={actionsDisabled}
                title={t('common.delete')}
                aria-label={t('common.delete')}
                className="btn-danger-ghost"
              >
                <IconTrash2 size={15} />
              </Button>
              {renderExtraActions ? renderExtraActions(item, index) : null}
            </div>
            <div className={metaClassName ?? 'item-meta'}>{renderContent(item, index)}</div>
          </div>
        );
      })}
    </div>
  );
}
