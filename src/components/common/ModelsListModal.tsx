import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from './LoadingSkeleton';
import { copyToClipboard } from '@/utils/clipboard';
import { useNotificationStore } from '@/stores';
import sharedStyles from './ModelsListModal.module.scss';

export interface SharedModelItem {
  id: string;
  display_name?: string;
  type?: string;
  isExcluded?: boolean;
}

export interface ModelsListModalProps {
  open: boolean;
  title: string;
  loading?: boolean;
  error?: 'unsupported' | null;
  models: SharedModelItem[];
  onClose: () => void;
}

export function ModelsListModal({
  open,
  title,
  loading = false,
  error = null,
  models,
  onClose,
}: ModelsListModalProps) {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);

  const handleCopy = async (text: string) => {
    const copied = await copyToClipboard(text);
    showNotification(
      copied
        ? t('notification.link_copied', { defaultValue: '已复制到剪贴板' })
        : t('notification.copy_failed', { defaultValue: '复制失败' }),
      copied ? 'success' : 'error'
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {loading ? (
        <SkeletonRows count={6} withAvatar={false} />
      ) : error === 'unsupported' ? (
        <EmptyState
          title={t('auth_files.models_unsupported', { defaultValue: '当前版本不支持此功能' })}
          description={t('auth_files.models_unsupported_desc', {
            defaultValue: '请更新 CLI Proxy API 到最新版本后重试',
          })}
        />
      ) : models.length === 0 ? (
        <EmptyState
          title={t('auth_files.models_empty', { defaultValue: '暂无可用模型' })}
          description={t('auth_files.models_empty_desc', {
            defaultValue: '该提供商/凭证可能尚未加载或没有绑定任何模型',
          })}
        />
      ) : (
        <div className={sharedStyles.modelsList}>
          {models.map((model, idx) => {
            const isExcluded = model.isExcluded === true;
            return (
              <div
                key={`${model.id}-${idx}`}
                className={`${sharedStyles.modelItem} ${isExcluded ? sharedStyles.modelItemExcluded : ''}`}
                onClick={() => handleCopy(model.id)}
                title={
                  isExcluded
                    ? t('auth_files.models_excluded_hint', {
                        defaultValue: '此 OAuth 模型已被禁用',
                      })
                    : t('common.copy', { defaultValue: '点击复制' })
                }
              >
                <span className={sharedStyles.modelId}>{model.id}</span>
                {model.display_name && model.display_name !== model.id && (
                  <span className={sharedStyles.modelDisplayName}>{model.display_name}</span>
                )}
                {model.type && <span className={sharedStyles.modelType}>{model.type}</span>}
                {isExcluded && (
                  <span className={sharedStyles.modelExcludedBadge}>
                    {t('auth_files.models_excluded_badge', { defaultValue: '已禁用' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
