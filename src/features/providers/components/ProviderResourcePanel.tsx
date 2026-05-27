import { useTranslation } from 'react-i18next';
import { IconPlus } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ProviderRecentUsageMap } from '@/components/providers/utils';
import type { ProviderGroup, ProviderResource } from '../types';
import { ProviderResourceCards } from './ProviderResourceCards';
import { OpenAIBrandToolbar } from './OpenAIBrandToolbar';
import styles from './ProviderResourcePanel.module.scss';

interface ProviderResourcePanelProps {
  group: ProviderGroup;
  filteredResources: ProviderResource[];
  selectedId: string | null;
  disableMutations?: boolean;
  usageByProvider?: ProviderRecentUsageMap;
  openaiControls?: {
    sortBy: any;
    sortDir: any;
    onSortBy: (v: any) => void;
    onSortDir: (v: any) => void;
    availableModels: ReadonlyArray<string>;
    selectedModels: ReadonlySet<string>;
    onSelectedModelsChange: (v: any) => void;
  };
  onView: (resource: ProviderResource) => void;
  onEdit: (resource: ProviderResource) => void;
  onDelete: (resource: ProviderResource) => void;
  onToggleDisabled?: (resource: ProviderResource, disabled: boolean) => void;
  onCreate: () => void;
}

export function ProviderResourcePanel({
  group,
  filteredResources,
  selectedId,
  disableMutations,
  usageByProvider,
  openaiControls,
  onView,
  onEdit,
  onDelete,
  onToggleDisabled,
  onCreate,
}: ProviderResourcePanelProps) {
  const { t } = useTranslation();
  const realResources = filteredResources.filter((r) => !r.flags.isPlaceholder);

  return (
    <Card className={styles.panel}>
      {group.issue ? (
        <div className="error-box" style={{ marginBottom: 16 }}>
          <strong>{t('providersPage.table.providerIssue')}</strong>
          {group.issue.status ? ` · ${group.issue.status}` : ''}
          <div>{group.issue.message}</div>
        </div>
      ) : null}

      {openaiControls && (
        <div className={styles.openaiToolbarRow} style={{ marginBottom: 16 }}>
          <OpenAIBrandToolbar
            sortBy={openaiControls.sortBy}
            sortDir={openaiControls.sortDir}
            onSortBy={openaiControls.onSortBy}
            onSortDir={openaiControls.onSortDir}
            availableModels={openaiControls.availableModels}
            selectedModels={openaiControls.selectedModels}
            onSelectedModelsChange={openaiControls.onSelectedModelsChange}
          />
        </div>
      )}

      {realResources.length === 0 && group.id !== 'ampcode' ? (
        <div className={styles.empty}>
          <div style={{ marginBottom: 12 }}>{t('providersPage.table.empty')}</div>
          <Button variant="secondary" size="sm" onClick={onCreate} disabled={disableMutations}>
            <IconPlus size={14} />
            <span>{t('providersPage.actions.new')}</span>
          </Button>
        </div>
      ) : (
        <ProviderResourceCards
          resources={filteredResources}
          selectedId={selectedId}
          disableMutations={disableMutations}
          usageByProvider={usageByProvider}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleDisabled={onToggleDisabled}
        />
      )}
    </Card>
  );
}
