import { createGuardedLocalStorageAdapter } from '@lib/storage/guarded-local-storage';
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

describe('createGuardedLocalStorageAdapter', () => {
  let ls: ReturnType<typeof makeLocalStorage>;
  let adapter: ReturnType<typeof createGuardedLocalStorageAdapter>;

  beforeEach(() => {
    ls = makeLocalStorage();
    setWindow({ localStorage: ls });
    adapter = createGuardedLocalStorageAdapter();
  });

  afterEach(() => {
    setWindow(originalWindow);
  });

  describe('with a browser window', () => {
    it('sets and gets a value via window.localStorage', () => {
      adapter.setItem('k', 'v');
      expect(ls.setItem).toHaveBeenCalledWith('k', 'v');
      expect(adapter.getItem('k')).toBe('v');
    });

    it('returns null for a missing key', () => {
      expect(adapter.getItem('missing')).toBeNull();
    });

    it('removes a value', () => {
      adapter.setItem('k', 'v');
      adapter.removeItem('k');
      expect(ls.removeItem).toHaveBeenCalledWith('k');
      expect(adapter.getItem('k')).toBeNull();
    });
  });

  describe('SSR / Node (no window)', () => {
    beforeEach(() => {
      setWindow(undefined);
    });

    it('getItem returns null without throwing', () => {
      expect(() => adapter.getItem('k')).not.toThrow();
      expect(adapter.getItem('k')).toBeNull();
    });

    it('setItem is a no-op that does not throw', () => {
      expect(() => adapter.setItem('k', 'v')).not.toThrow();
      expect(ls.setItem).not.toHaveBeenCalled();
    });

    it('removeItem is a no-op that does not throw', () => {
      expect(() => adapter.removeItem('k')).not.toThrow();
      expect(ls.removeItem).not.toHaveBeenCalled();
    });
  });
});
