import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconDownload, IconPlus, IconUpload } from '@/components/ui/icons';
import { downloadBlob } from '@/utils/download';
import styles from '@/pages/AiProvidersPage.module.scss';

interface ProviderCardProps {
  /** Card title with icon */
  icon: string;
  title: string;
  /** The full config array for export */
  configs: unknown[];
  /** Filename used for export (without extension) */
  exportFilename: string;
  /** Whether controls are disabled */
  disabled?: boolean;
  /** Called when "Add" is clicked */
  onAdd: () => void;
  /** Called when "Import" file is selected */
  onImport?: () => void;
  /** Add button tooltip */
  addLabel?: string;
  /** Extra toolbar controls (slot) */
  extraActions?: ReactNode;
  /** Card body content */
  children: ReactNode;
}

export function ProviderCard({
  icon,
  title,
  configs,
  exportFilename,
  disabled = false,
  onAdd,
  onImport,
  addLabel,
  extraActions,
  children,
}: ProviderCardProps) {
  const { t } = useTranslation();

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(configs, null, 2)], { type: 'application/json' });
    downloadBlob({ filename: `${exportFilename}.json`, blob });
  };

  const hasConfigs = configs.length > 0;

  return (
    <Card
      title={
        <span className={styles.cardTitle}>
          <img src={icon} alt="" className={styles.cardTitleIcon} />
          {title}
        </span>
      }
      extra={
        <>
          {hasConfigs && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={disabled}
              title={t('ai_providers.export_configs')}
              aria-label={t('ai_providers.export_configs')}
            >
              <IconUpload size={16} />
            </Button>
          )}
          {hasConfigs && onImport && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onImport}
              disabled={disabled}
              title={t('ai_providers.import_configs')}
              aria-label={t('ai_providers.import_configs')}
            >
              <IconDownload size={16} />
            </Button>
          )}
          {extraActions}
          <Button
            size="sm"
            onClick={onAdd}
            disabled={disabled}
            title={addLabel ?? t('common.add', { defaultValue: 'Add' })}
            aria-label={addLabel ?? t('common.add', { defaultValue: 'Add' })}
          >
            <IconPlus size={16} />
          </Button>
        </>
      }
    >
      {children}
    </Card>
  );
}
