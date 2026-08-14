import { mmkvStorage } from '@lib/storage/mmkv-storage.web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory localStorage shim installed on a synthetic `window`.
function makeLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    clear: () => {
      store = {};
    },
  };
}

const originalWindow = (globalThis as { window?: unknown }).window;

function setWindow(value: unknown) {
  Object.defineProperty(globalThis, 'window', { value, configurable: true, writable: true });
}

describe('mmkvStorage.web', () => {
  let ls: ReturnType<typeof makeLocalStorage>;

  beforeEach(() => {
    ls = makeLocalStorage();
    setWindow({ localStorage: ls });
  });

  afterEach(() => {
    setWindow(originalWindow);
  });

  describe('with a browser window', () => {
    it('sets and gets a value via window.localStorage', () => {
      mmkvStorage.setItem('k', 'v');
      expect(ls.setItem).toHaveBeenCalledWith('k', 'v');
      expect(mmkvStorage.getItem('k')).toBe('v');
    });

    it('returns null for a missing key', () => {
      expect(mmkvStorage.getItem('missing')).toBeNull();
    });

    it('removes a value', () => {
      mmkvStorage.setItem('k', 'v');
      mmkvStorage.removeItem('k');
      expect(ls.removeItem).toHaveBeenCalledWith('k');
      expect(mmkvStorage.getItem('k')).toBeNull();
    });

    it('overwrites an existing value', () => {
      mmkvStorage.setItem('k', 'first');
      mmkvStorage.setItem('k', 'second');
      expect(mmkvStorage.getItem('k')).toBe('second');
    });

    it('round-trips JSON (Zustand persist payload)', () => {
      const payload = JSON.stringify({ isOnboarded: true });
      mmkvStorage.setItem('app-store', payload);
      expect(JSON.parse(mmkvStorage.getItem('app-store') as string)).toEqual({ isOnboarded: true });
    });
  });

  describe('SSR / Node (no window)', () => {
    beforeEach(() => {
      setWindow(undefined);
    });

    it('getItem returns null without throwing', () => {
      expect(() => mmkvStorage.getItem('k')).not.toThrow();
      expect(mmkvStorage.getItem('k')).toBeNull();
    });

    it('setItem is a no-op that does not throw', () => {
      expect(() => mmkvStorage.setItem('k', 'v')).not.toThrow();
      expect(ls.setItem).not.toHaveBeenCalled();
    });

    it('removeItem is a no-op that does not throw', () => {
      expect(() => mmkvStorage.removeItem('k')).not.toThrow();
      expect(ls.removeItem).not.toHaveBeenCalled();
    });
  });
});
