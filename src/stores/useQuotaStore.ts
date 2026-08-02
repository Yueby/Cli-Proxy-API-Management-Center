/**
 * Quota cache that survives route switches.
 */

import { create } from 'zustand';
import type {
  AntigravityQuotaState,
  ClaudeQuotaState,
  CodexQuotaState,
  KimiQuotaState,
  XaiQuotaState,
} from '@/types';

export type QuotaOperationKind = 'refresh' | 'reset';

export interface QuotaOperationToken {
  key: string;
  id: number;
}

interface QuotaPendingOperation {
  kind: QuotaOperationKind;
  id: number;
}

type QuotaUpdater<T> = T | ((prev: T) => T);

interface QuotaStoreState {
  cacheGeneration: number;
  antigravityQuota: Record<string, AntigravityQuotaState>;
  claudeQuota: Record<string, ClaudeQuotaState>;
  codexQuota: Record<string, CodexQuotaState>;
  kimiQuota: Record<string, KimiQuotaState>;
  xaiQuota: Record<string, XaiQuotaState>;
  pendingOperations: Record<string, QuotaPendingOperation>;
  setAntigravityQuota: (updater: QuotaUpdater<Record<string, AntigravityQuotaState>>) => void;
  setClaudeQuota: (updater: QuotaUpdater<Record<string, ClaudeQuotaState>>) => void;
  setCodexQuota: (updater: QuotaUpdater<Record<string, CodexQuotaState>>) => void;
  setKimiQuota: (updater: QuotaUpdater<Record<string, KimiQuotaState>>) => void;
  setXaiQuota: (updater: QuotaUpdater<Record<string, XaiQuotaState>>) => void;
  clearQuotaCache: () => void;
}

let nextQuotaOperationId = 0;

const quotaOperationKey = (provider: string, fileName: string): string =>
  `${provider}\u0000${fileName}`;

const resolveUpdater = <T>(updater: QuotaUpdater<T>, prev: T): T => {
  if (typeof updater === 'function') {
    return (updater as (value: T) => T)(prev);
  }
  return updater;
};

export const useQuotaStore = create<QuotaStoreState>((set) => ({
  cacheGeneration: 0,
  antigravityQuota: {},
  claudeQuota: {},
  codexQuota: {},
  kimiQuota: {},
  xaiQuota: {},
  pendingOperations: {},
  setAntigravityQuota: (updater) =>
    set((state) => ({
      antigravityQuota: resolveUpdater(updater, state.antigravityQuota),
    })),
  setClaudeQuota: (updater) =>
    set((state) => ({
      claudeQuota: resolveUpdater(updater, state.claudeQuota),
    })),
  setCodexQuota: (updater) =>
    set((state) => ({
      codexQuota: resolveUpdater(updater, state.codexQuota),
    })),
  setKimiQuota: (updater) =>
    set((state) => ({
      kimiQuota: resolveUpdater(updater, state.kimiQuota),
    })),
  setXaiQuota: (updater) =>
    set((state) => ({
      xaiQuota: resolveUpdater(updater, state.xaiQuota),
    })),
  clearQuotaCache: () =>
    set((state) => ({
      cacheGeneration: state.cacheGeneration + 1,
      antigravityQuota: {},
      claudeQuota: {},
      codexQuota: {},
      kimiQuota: {},
      xaiQuota: {},
      pendingOperations: {},
    })),
}));

export const getQuotaOperation = (
  provider: string,
  fileName: string
): QuotaOperationKind | null =>
  useQuotaStore.getState().pendingOperations[quotaOperationKey(provider, fileName)]?.kind ?? null;

export const beginQuotaOperation = (
  provider: string,
  fileName: string,
  kind: QuotaOperationKind
): QuotaOperationToken | null => {
  const key = quotaOperationKey(provider, fileName);
  if (useQuotaStore.getState().pendingOperations[key]) return null;

  const id = ++nextQuotaOperationId;
  useQuotaStore.setState((state) => ({
    pendingOperations: { ...state.pendingOperations, [key]: { kind, id } },
  }));
  return { key, id };
};

export const finishQuotaOperation = (token: QuotaOperationToken): boolean => {
  const current = useQuotaStore.getState().pendingOperations[token.key];
  if (!current || current.id !== token.id) return false;

  useQuotaStore.setState((state) => {
    const latest = state.pendingOperations[token.key];
    if (!latest || latest.id !== token.id) return state;
    const pendingOperations = { ...state.pendingOperations };
    delete pendingOperations[token.key];
    return { pendingOperations };
  });
  return true;
};

export const runQuotaOperation = async <T>(
  provider: string,
  fileName: string,
  kind: QuotaOperationKind,
  operation: () => Promise<T>
): Promise<T | undefined> => {
  const token = beginQuotaOperation(provider, fileName, kind);
  if (!token) return undefined;
  try {
    return await operation();
  } finally {
    finishQuotaOperation(token);
  }
};

export const captureQuotaCacheGeneration = (): number =>
  useQuotaStore.getState().cacheGeneration;

export const commitIfQuotaCacheCurrent = (
  generation: number,
  commit: () => void
): boolean => {
  if (useQuotaStore.getState().cacheGeneration !== generation) return false;
  commit();
  return true;
};
