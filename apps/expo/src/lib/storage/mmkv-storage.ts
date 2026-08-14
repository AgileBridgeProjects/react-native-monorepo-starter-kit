import { createMMKV } from 'react-native-mmkv';

import type { StateStorage } from 'zustand/middleware';

/**
 * Fast key-value storage backed by react-native-mmkv.
 *
 * Use for NON-SENSITIVE data only (app preferences, onboarding state, UI flags).
 * Sensitive data (tokens, credentials) must go through secureStorage (expo-secure-store).
 *
 * Exposes a Zustand-compatible StateStorage interface so stores can use the
 * `persist` middleware without any adapter boilerplate.
 */
const mmkv = createMMKV({ id: 'starterkit-app' });

export const mmkvStorage = {
  getItem: (name: string): string | null => {
    return mmkv.getString(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    mmkv.set(name, value);
  },
  removeItem: (name: string): void => {
    mmkv.remove(name);
  },
} satisfies StateStorage;
