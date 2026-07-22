import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModelMappingDiagram, type ModelMappingDiagramRef } from '@/components/modelAlias';
import { IconChevronUp, IconPencil, IconPlus, IconTrash2 } from '@/components/ui/icons';
import type { OAuthModelAliasEntry } from '@/types';
import type { AuthFileModelItem, OAuthConfigLoadError } from '@/features/authFiles/constants';
import styles from '@/pages/AuthFilesPage.module.scss';
type ViewMode = 'diagram' | 'list';
type SettingsTab = 'excluded' | 'alias';

export type OAuthSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  disableControls: boolean;

  // Excluded state & handlers
  excludedError: OAuthConfigLoadError;
  excluded: Record<string, string[]>;
  onAddExcluded: () => void;
  onEditExcluded: (provider: string) => void;
  onDeleteExcluded: (provider: string) => void;

  // Model alias state & handlers
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddAlias: () => void;
  onEditProvider: (provider?: string) => void;
  onDeleteProvider: (provider: string) => void;
  modelAliasError: OAuthConfigLoadError;
  modelAlias: Record<string, OAuthModelAliasEntry[]>;
  allProviderModels: Record<string, AuthFileModelItem[]>;
  onUpdateAlias: (provider: string, sourceModel: string, newAlias: string) => Promise<void>;
  onDeleteLink: (provider: string, sourceModel: string, alias: string) => void;
  onToggleFork: (
    provider: string,
    sourceModel: string,
    alias: string,
    fork: boolean
  ) => Promise<void>;
  onRenameAlias: (oldAlias: string, newAlias: string) => Promise<void>;
  onDeleteAlias: (aliasName: string) => void;
};

export function OAuthSettingsModal(props: OAuthSettingsModalProps) {
  const { t } = useTranslation();
  const diagramRef = useRef<ModelMappingDiagramRef | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('excluded');

  const {
    open,
    onClose,
    disableControls,
    excludedError,
    excluded,
    onAddExcluded,
    onEditExcluded,
    onDeleteExcluded,
    viewMode,
    onViewModeChange,
    onAddAlias,
    onEditProvider,
    onDeleteProvider,
    modelAliasError,
    modelAlias,
    allProviderModels,
    onUpdateAlias,
    onDeleteLink,
    onToggleFork,
    onRenameAlias,
    onDeleteAlias,
  } = props;

  const renderExcludedContent = () => {
    if (excludedError === 'unsupported') {
      return (
        <EmptyState
          title={t('oauth_excluded.upgrade_required_title')}
          description={t('oauth_excluded.upgrade_required_desc')}
        />
      );
    }

    if (excludedError === 'loading') {
      return <EmptyState title={t('common.loading')} />;
    }

    if (excludedError === 'load') {
      return <EmptyState title={t('notification.refresh_failed')} />;
    }

    if (Object.keys(excluded).length === 0) {
      return <EmptyState title={t('oauth_excluded.list_empty_all')} />;
    }

    return (
      <div className={styles.excludedList}>
        {Object.entries(excluded).map(([provider, models]) => (
          <div key={provider} className={styles.excludedItem}>
            <div className={styles.excludedInfo}>
              <div className={styles.excludedProvider}>{provider}</div>
              <div className={styles.excludedModels}>
                {models?.length
                  ? t('oauth_excluded.model_count', { count: models.length })
                  : t('oauth_excluded.no_models')}
              </div>
            </div>
            <div className={styles.excludedActions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEditExcluded(provider)}
                title={t('common.edit')}
                aria-label={t('common.edit')}
              >
                <IconPencil size={15} />
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDeleteExcluded(provider)}
                title={t('oauth_excluded.delete')}
                aria-label={t('oauth_excluded.delete')}
              >
                <IconTrash2 size={15} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAliasContent = () => {
    if (modelAliasError === 'unsupported') {
      return (
        <EmptyState
          title={t('oauth_model_alias.upgrade_required_title')}
          description={t('oauth_model_alias.upgrade_required_desc')}
        />
      );
    }

    if (modelAliasError === 'loading') {
      return <EmptyState title={t('common.loading')} />;
    }

    if (modelAliasError === 'load') {
      return <EmptyState title={t('notification.refresh_failed')} />;
    }

    if (viewMode === 'diagram') {
      if (Object.keys(modelAlias).length === 0) {
        return <EmptyState title={t('oauth_model_alias.list_empty_all')} />;
      }

      return (
        <div className={styles.aliasChartSection}>
          <div className={styles.aliasChartHeader}>
            <h4 className={styles.aliasChartTitle}>{t('oauth_model_alias.chart_title')}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => diagramRef.current?.collapseAll()}
              disabled={disableControls || modelAliasError === 'unsupported'}
              title={t('oauth_model_alias.diagram_collapse')}
              aria-label={t('oauth_model_alias.diagram_collapse')}
            >
              <IconChevronUp size={16} />
            </Button>
          </div>
          <ModelMappingDiagram
            ref={diagramRef}
            modelAlias={modelAlias}
            allProviderModels={allProviderModels}
            onUpdate={onUpdateAlias}
            onDeleteLink={onDeleteLink}
            onToggleFork={onToggleFork}
            onRenameAlias={onRenameAlias}
            onDeleteAlias={onDeleteAlias}
            onEditProvider={onEditProvider}
            onDeleteProvider={onDeleteProvider}
            className={styles.aliasChart}
          />
        </div>
      );
    }

    if (Object.keys(modelAlias).length === 0) {
      return <EmptyState title={t('oauth_model_alias.list_empty_all')} />;
    }

    return (
      <div className={styles.excludedList}>
        {Object.entries(modelAlias).map(([provider, mappings]) => (
          <div key={provider} className={styles.excludedItem}>
            <div className={styles.excludedInfo}>
              <div className={styles.excludedProvider}>{provider}</div>
              <div className={styles.excludedModels}>
                {mappings?.length
                  ? t('oauth_model_alias.model_count', { count: mappings.length })
                  : t('oauth_model_alias.no_models')}
              </div>
            </div>
            <div className={styles.excludedActions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEditProvider(provider)}
                title={t('common.edit')}
                aria-label={t('common.edit')}
              >
                <IconPencil size={15} />
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDeleteProvider(provider)}
                title={t('oauth_model_alias.delete')}
                aria-label={t('oauth_model_alias.delete')}
              >
                <IconTrash2 size={15} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>
            {t('auth_files.oauth_settings_title', { defaultValue: 'OAuth 禁用与别名设置' })}
          </span>
          <SegmentedControl
            options={[
              { value: 'excluded', label: t('oauth_excluded.title') },
              { value: 'alias', label: t('oauth_model_alias.title') },
            ]}
            value={activeTab}
            onChange={(val) => setActiveTab(val as SettingsTab)}
            disabled={disableControls}
          />
        </div>
      }
      onClose={onClose}
      width={activeTab === 'alias' && viewMode === 'diagram' ? 840 : 540}
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <div>
            {activeTab === 'alias' && modelAliasError !== 'unsupported' && (
              <SegmentedControl
                options={[
                  { value: 'list', label: t('oauth_model_alias.view_mode_list') },
                  { value: 'diagram', label: t('oauth_model_alias.view_mode_diagram') },
                ]}
                value={viewMode}
                onChange={(mode) => onViewModeChange(mode as ViewMode)}
                disabled={disableControls}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={activeTab === 'excluded' ? onAddExcluded : onAddAlias}
              disabled={
                disableControls ||
                (activeTab === 'excluded' && excludedError === 'unsupported') ||
                (activeTab === 'alias' && modelAliasError === 'unsupported')
              }
            >
              <IconPlus size={14} />
              <span>
                {activeTab === 'excluded' ? t('oauth_excluded.add') : t('oauth_model_alias.add')}
              </span>
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ minHeight: '260px', maxHeight: '60vh', overflowY: 'auto' }}>
        {activeTab === 'excluded' ? renderExcludedContent() : renderAliasContent()}
      </div>
    </Modal>
  );
}
