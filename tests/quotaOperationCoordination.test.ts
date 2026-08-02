import { beforeEach, describe, expect, test } from 'bun:test';
import {
  beginQuotaOperation,
  finishQuotaOperation,
  getQuotaOperation,
  runQuotaOperation,
  useQuotaStore,
} from '../src/stores/useQuotaStore';

describe('quota operation coordination', () => {
  beforeEach(() => {
    useQuotaStore.getState().clearQuotaCache();
  });

  test('rejects refresh while reset owns the same provider/file', () => {
    const reset = beginQuotaOperation('codex', 'same.json', 'reset');
    expect(reset).not.toBeNull();
    expect(getQuotaOperation('codex', 'same.json')).toBe('reset');
    expect(beginQuotaOperation('codex', 'same.json', 'refresh')).toBeNull();
    finishQuotaOperation(reset!);
  });

  test('rejects reset while refresh owns the same provider/file', () => {
    const refresh = beginQuotaOperation('codex', 'same.json', 'refresh');
    expect(refresh).not.toBeNull();
    expect(beginQuotaOperation('codex', 'same.json', 'reset')).toBeNull();
    finishQuotaOperation(refresh!);
  });

  test('does not block another file', () => {
    const first = beginQuotaOperation('codex', 'first.json', 'reset');
    const second = beginQuotaOperation('codex', 'second.json', 'refresh');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    finishQuotaOperation(first!);
    finishQuotaOperation(second!);
  });

  test('releases ownership in finally after success and error', async () => {
    await expect(
      runQuotaOperation('codex', 'success.json', 'refresh', async () => 'ok')
    ).resolves.toBe('ok');
    expect(getQuotaOperation('codex', 'success.json')).toBeNull();

    await expect(
      runQuotaOperation('codex', 'error.json', 'reset', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(getQuotaOperation('codex', 'error.json')).toBeNull();
  });

  test('generation changes release all ownership and stale finally cannot release a new owner', () => {
    const stale = beginQuotaOperation('codex', 'same.json', 'refresh');
    expect(stale).not.toBeNull();

    useQuotaStore.getState().clearQuotaCache();
    expect(getQuotaOperation('codex', 'same.json')).toBeNull();

    const current = beginQuotaOperation('codex', 'same.json', 'reset');
    expect(current).not.toBeNull();
    finishQuotaOperation(stale!);
    expect(getQuotaOperation('codex', 'same.json')).toBe('reset');
    finishQuotaOperation(current!);
  });
});
