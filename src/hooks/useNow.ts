import { useSyncExternalStore } from 'react';
import { MINUTE_CLOCK } from '@/utils/time/sharedClock';

const noopSubscribe = () => () => {};
const FROZEN_NOW = Date.now();
const frozenSnapshot = () => FROZEN_NOW;
const serverSnapshot = () => 0;

/** Current instant from one app-wide minute clock. */
export function useNow(enabled = true): number {
  return useSyncExternalStore(
    enabled ? MINUTE_CLOCK.subscribe : noopSubscribe,
    enabled ? MINUTE_CLOCK.getSnapshot : frozenSnapshot,
    serverSnapshot
  );
}
