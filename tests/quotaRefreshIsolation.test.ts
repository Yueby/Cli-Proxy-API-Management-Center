import { beforeEach, describe, expect, test } from 'bun:test';
import { executeQuotaRefresh } from '../src/features/authFiles/quotaRefresh';
import { useQuotaStore } from '../src/stores/useQuotaStore';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('quota refresh connection isolation', () => {
  beforeEach(() => useQuotaStore.getState().clearQuotaCache());

  test('a delayed success from the previous generation cannot publish', async () => {
    const response = deferred<{ windows: string[] }>();
    const commits: string[] = [];
    const request = executeQuotaRefresh({
      provider: 'codex',
      fileName: 'same.json',
      fetchQuota: () => response.promise,
      commitLoading: () => commits.push('loading'),
      commitSuccess: () => commits.push('success'),
      commitError: () => commits.push('error'),
    });

    expect(commits).toEqual(['loading']);
    useQuotaStore.getState().clearQuotaCache();
    response.resolve({ windows: [] });

    expect(await request).toBe(false);
    expect(commits).toEqual(['loading']);
  });

  test('a delayed error from the previous generation cannot publish and releases the operation', async () => {
    const response = deferred<never>();
    const commits: string[] = [];
    const request = executeQuotaRefresh({
      provider: 'codex',
      fileName: 'same.json',
      fetchQuota: () => response.promise,
      commitLoading: () => commits.push('loading'),
      commitSuccess: () => commits.push('success'),
      commitError: () => commits.push('error'),
    });

    useQuotaStore.getState().clearQuotaCache();
    response.reject(new Error('old connection'));

    expect(await request).toBe(false);
    expect(commits).toEqual(['loading']);
    expect(useQuotaStore.getState().pendingOperations).toEqual({});
  });
});
