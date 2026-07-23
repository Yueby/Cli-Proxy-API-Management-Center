import { useTranslation } from 'react-i18next';
import type { AuthFileModelItem } from '@/features/authFiles/constants';
import { isModelExcluded } from '@/features/authFiles/constants';
import { ModelsListModal, type SharedModelItem } from '@/components/common/ModelsListModal';

export type AuthFileModelsModalProps = {
  open: boolean;
  fileName: string;
  fileType: string;
  loading: boolean;
  error: 'unsupported' | null;
  models: AuthFileModelItem[];
  excluded: Record<string, string[]>;
  onClose: () => void;
};

export function AuthFileModelsModal(props: AuthFileModelsModalProps) {
  const { t } = useTranslation();
  const { open, fileName, fileType, loading, error, models, excluded, onClose } = props;

  const sharedModels: SharedModelItem[] = models.map((model) => ({
    id: model.id,
    display_name: model.display_name,
    type: model.type,
    isExcluded: isModelExcluded(model.id, fileType, excluded),
  }));

  const title = t('auth_files.models_title', { defaultValue: '支持的模型' }) + ` - ${fileName}`;

  return (
    <ModelsListModal
      open={open}
      title={title}
      loading={loading}
      error={error}
      models={sharedModels}
      onClose={onClose}
    />
  );
}
