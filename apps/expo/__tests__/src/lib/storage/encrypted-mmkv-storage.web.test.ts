import { encryptedMmkvStorage } from '@lib/storage/encrypted-mmkv-storage.web';
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

describe('encryptedMmkvStorage.web', () => {
  let ls: ReturnType<typeof makeLocalStorage>;

  beforeEach(() => {
    ls = makeLocalStorage();
    setWindow({ localStorage: ls });
  });

  afterEach(() => {
    setWindow(originalWindow);
  });

  it('sets and gets a value via window.localStorage', () => {
    encryptedMmkvStorage.setItem('k', 'v');
    expect(ls.setItem).toHaveBeenCalledWith('k', 'v');
    expect(encryptedMmkvStorage.getItem('k')).toBe('v');
  });

  it('returns null for a missing key when there is no window', () => {
    setWindow(undefined);
    expect(encryptedMmkvStorage.getItem('k')).toBeNull();
  });
});
