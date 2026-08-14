import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Centralised keys for all secure storage values.
 * Using constants prevents typos and makes it easy to audit what we persist.
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'starterkit_access_token',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Web shim — expo-secure-store only works on native.
 * Uses sessionStorage so tokens are cleared when the tab closes.
 * Operations are wrapped in try/catch because sessionStorage may throw
 * in private-browsing modes or when storage quota is exceeded.
 */
const webStorage = {
  getItemAsync: (key: string): Promise<string | null> => {
    try {
      return Promise.resolve(sessionStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  },
  setItemAsync: (key: string, value: string): Promise<void> => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Storage quota exceeded or blocked — fail silently
    }
    return Promise.resolve();
  },
  deleteItemAsync: (key: string): Promise<void> => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Nothing to do if removal fails
    }
    return Promise.resolve();
  },
};

const storage = Platform.OS === 'web' ? webStorage : SecureStore;

export const secureStorage = {
  getItem: (key: StorageKey): Promise<string | null> => storage.getItemAsync(key),
  setItem: (key: StorageKey, value: string): Promise<void> => storage.setItemAsync(key, value),
  removeItem: (key: StorageKey): Promise<void> => storage.deleteItemAsync(key),
  clear: async (): Promise<void> => {
    await Promise.all(Object.values(STORAGE_KEYS).map((key) => storage.deleteItemAsync(key)));
  },
};
