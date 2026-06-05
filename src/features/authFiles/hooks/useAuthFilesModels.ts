import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authFilesApi } from '@/services/api';
import { useNotificationStore } from '@/stores';
import type { AuthFileItem } from '@/types';
import type { AuthFileModelItem } from '@/features/authFiles/constants';

type ModelsError = 'unsupported' | null;

export type UseAuthFilesModelsResult = {
  modelsModalOpen: boolean;
  modelsLoading: boolean;
  modelsList: AuthFileModelItem[];
  modelsFileName: string;
  modelsFileType: string;
  modelsError: ModelsError;
  showModels: (item: AuthFileItem) => Promise<void>;
  prefetchModels: (item: AuthFileItem) => Promise<void>;
  getCachedModels: (name: string) => AuthFileModelItem[] | undefined;
  closeModelsModal: () => void;
};

export function useAuthFilesModels(): UseAuthFilesModelsResult {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);

  const [modelsModalOpen, setModelsModalOpen] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsList, setModelsList] = useState<AuthFileModelItem[]>([]);
  const [modelsFileName, setModelsFileName] = useState('');
  const [modelsFileType, setModelsFileType] = useState('');
  const [modelsError, setModelsError] = useState<ModelsError>(null);
  const modelsCacheRef = useRef<Map<string, AuthFileModelItem[]>>(new Map());

  const closeModelsModal = useCallback(() => {
    setModelsModalOpen(false);
  }, []);

  const getCachedModels = useCallback((name: string) => modelsCacheRef.current.get(name), []);

  const loadModels = useCallback(async (item: AuthFileItem) => {
    const cached = modelsCacheRef.current.get(item.name);
    if (cached) return cached;

    const models = await authFilesApi.getModelsForAuthFile(item.name);
    modelsCacheRef.current.set(item.name, models);
    return models;
  }, []);

  const prefetchModels = useCallback(
    async (item: AuthFileItem) => {
      if (modelsCacheRef.current.has(item.name)) return;
      try {
        await loadModels(item);
      } catch {
        // Hover prefetch is best-effort; click still reports actionable errors.
      }
    },
    [loadModels]
  );

  const showModels = useCallback(
    async (item: AuthFileItem) => {
      setModelsFileName(item.name);
      setModelsFileType(item.type || '');
      setModelsList([]);
      setModelsError(null);
      setModelsModalOpen(true);

      const cached = modelsCacheRef.current.get(item.name);
      if (cached) {
        setModelsList(cached);
        setModelsLoading(false);
        return;
      }

      setModelsLoading(true);
      try {
        const models = await loadModels(item);
        setModelsList(models);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '';
        if (
          errorMessage.includes('404') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('Not Found')
        ) {
          setModelsError('unsupported');
        } else {
          showNotification(`${t('notification.load_failed')}: ${errorMessage}`, 'error');
        }
      } finally {
        setModelsLoading(false);
      }
    },
    [loadModels, showNotification, t]
  );

  return {
    modelsModalOpen,
    modelsLoading,
    modelsList,
    modelsFileName,
    modelsFileType,
    modelsError,
    showModels,
    prefetchModels,
    getCachedModels,
    closeModelsModal,
  };
}
