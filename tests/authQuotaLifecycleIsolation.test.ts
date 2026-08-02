import { beforeEach, describe, expect, mock, test } from 'bun:test';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, String(value)),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
});
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { addEventListener: () => undefined, location: { host: 'test.local' } },
});

const fetchConfig = mock(async () => ({}));
const setConfig = mock(() => undefined);

mock.module('../src/stores/useConfigStore', () => ({
  useConfigStore: {
    getState: () => ({ fetchConfig, clearCache: () => undefined }),
  },
}));
mock.module('../src/stores/useModelsStore', () => ({
  useModelsStore: { getState: () => ({ clearCache: () => undefined }) },
}));
mock.module('../src/services/api/client', () => ({
  apiClient: { setConfig },
}));
mock.module('../src/services/api/version', () => ({
  versionApi: { detectRuntimeKind: async () => 'unknown' },
}));

const { useAuthStore } = await import('../src/stores/useAuthStore');
const { captureQuotaCacheGeneration, useQuotaStore } = await import('../src/stores/useQuotaStore');

const seedQuota = () => {
  useQuotaStore.getState().setCodexQuota({
    'same.json': { status: 'success', windows: [] },
  });
};

describe('auth lifecycle quota isolation', () => {
  beforeEach(() => {
    storage.clear();
    fetchConfig.mockClear();
    setConfig.mockClear();
    useQuotaStore.getState().clearQuotaCache();
    useAuthStore.setState({
      isAuthenticated: false,
      apiBase: '',
      managementKey: '',
      rememberPassword: false,
      connectionStatus: 'disconnected',
      connectionError: null,
    });
  });

  test('login clears quota before trying the new connection, including failed login', async () => {
    seedQuota();
    const generation = captureQuotaCacheGeneration();
    fetchConfig.mockImplementationOnce(async () => {
      throw new Error('connection failed');
    });

    await expect(
      useAuthStore.getState().login({ apiBase: 'https://new.example', managementKey: 'new-key' })
    ).rejects.toThrow('connection failed');

    expect(captureQuotaCacheGeneration()).toBe(generation + 1);
    expect(useQuotaStore.getState().codexQuota).toEqual({});
  });

  test('logout clears quota and increments generation', () => {
    seedQuota();
    const generation = captureQuotaCacheGeneration();
    useAuthStore.getState().logout();
    expect(captureQuotaCacheGeneration()).toBe(generation + 1);
    expect(useQuotaStore.getState().codexQuota).toEqual({});
  });

  test('checkAuth clears quota at the connection-validation boundary', async () => {
    seedQuota();
    const generation = captureQuotaCacheGeneration();
    useAuthStore.setState({ apiBase: 'https://restored.example', managementKey: 'restored-key' });

    expect(await useAuthStore.getState().checkAuth()).toBe(true);
    expect(captureQuotaCacheGeneration()).toBe(generation + 1);
    expect(useQuotaStore.getState().codexQuota).toEqual({});
  });
});
