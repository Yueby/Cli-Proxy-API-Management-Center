import {
  beginQuotaOperation,
  captureQuotaCacheGeneration,
  commitIfQuotaCacheCurrent,
  finishQuotaOperation,
} from '@/stores/useQuotaStore';

export interface ExecuteQuotaRefreshOptions<T> {
  provider: string;
  fileName: string;
  fetchQuota: () => Promise<T>;
  commitLoading: () => void;
  commitSuccess: (data: T) => void;
  commitError: (error: unknown) => void;
}

export async function executeQuotaRefresh<T>({
  provider,
  fileName,
  fetchQuota,
  commitLoading,
  commitSuccess,
  commitError,
}: ExecuteQuotaRefreshOptions<T>): Promise<boolean> {
  const operation = beginQuotaOperation(provider, fileName, 'refresh');
  if (!operation) return false;

  const cacheGeneration = captureQuotaCacheGeneration();
  commitIfQuotaCacheCurrent(cacheGeneration, commitLoading);

  try {
    const data = await fetchQuota();
    return commitIfQuotaCacheCurrent(cacheGeneration, () => commitSuccess(data));
  } catch (error: unknown) {
    commitIfQuotaCacheCurrent(cacheGeneration, () => commitError(error));
    return false;
  } finally {
    finishQuotaOperation(operation);
  }
}
