import { beforeEach, describe, expect, it, vi } from 'vitest';

// Override Platform.OS to 'web' to test the sessionStorage shim path.
// The global setup.ts sets Platform.OS = 'ios'; this file-level override takes precedence.
vi.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: vi.fn((obj: Record<string, unknown>) => obj.web ?? obj.default),
  },
}));

import { STORAGE_KEYS, secureStorage } from '@lib/storage/secure-storage';

// Platform.OS is 'web' so the sessionStorage shim is active.
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock });

describe('secureStorage', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
  });

  it('stores and retrieves a value', async () => {
    await secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'my-token');
    const result = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    expect(result).toBe('my-token');
  });

  it('returns null for a missing key', async () => {
    const result = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    expect(result).toBeNull();
  });

  it('removes a value', async () => {
    await secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'token');
    await secureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    const result = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    expect(result).toBeNull();
  });

  it('clears all keys', async () => {
    await secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'access');
    await secureStorage.clear();
    expect(await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
  });
});
