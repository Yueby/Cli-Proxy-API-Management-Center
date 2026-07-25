import { describe, expect, test } from 'bun:test';
import {
  AUTH_FILES_CHANGED_EVENT,
  notifyAuthFilesChanged,
} from '../src/features/authFiles/authFilesEvents';

describe('auth files change events', () => {
  test('dispatches a window event listeners can observe', () => {
    const listeners = new Map<string, Set<EventListener>>();
    const fakeWindow = {
      addEventListener(type: string, listener: EventListener) {
        const set = listeners.get(type) ?? new Set();
        set.add(listener);
        listeners.set(type, set);
      },
      removeEventListener(type: string, listener: EventListener) {
        listeners.get(type)?.delete(listener);
      },
      dispatchEvent(event: Event) {
        listeners.get(event.type)?.forEach((listener) => listener(event));
        return true;
      },
    };

    const previous = (globalThis as { window?: unknown }).window;
    (globalThis as { window: typeof fakeWindow }).window = fakeWindow;

    let fired = 0;
    const handler = () => {
      fired += 1;
    };

    try {
      fakeWindow.addEventListener(AUTH_FILES_CHANGED_EVENT, handler);
      notifyAuthFilesChanged();
      expect(fired).toBe(1);
      expect(AUTH_FILES_CHANGED_EVENT).toBe('auth-files-changed');
    } finally {
      fakeWindow.removeEventListener(AUTH_FILES_CHANGED_EVENT, handler);
      if (previous === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = previous;
      }
    }
  });
});
