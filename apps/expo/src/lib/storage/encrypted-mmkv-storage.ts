import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';

import type { StateStorage } from 'zustand/middleware';

const ENCRYPTION_KEY_STORAGE_KEY = 'starterkit_encrypted_mmkv_key';

/**
 * The MMKV encryption key, generated once and kept in the Keychain/Keystore via
 * expo-secure-store. `SecureStore.getItem`/`setItem` are the sync variants — MMKV
 * needs the key synchronously at instance creation, before any async read could land.
 */
function getOrCreateEncryptionKey(): string {
  const existing = SecureStore.getItem(ENCRYPTION_KEY_STORAGE_KEY);
  if (existing) return existing;

  // 32 hex chars = 32 bytes, the max key length AES-256 accepts.
  const generated = Crypto.randomUUID().replace(/-/g, '');
  SecureStore.setItem(ENCRYPTION_KEY_STORAGE_KEY, generated);
  return generated;
}

const mmkv = createMMKV({
  id: 'starterkit-app-encrypted',
  encryptionKey: getOrCreateEncryptionKey(),
  encryptionType: 'AES-256',
});

/**
 * Encrypted-at-rest key-value storage backed by react-native-mmkv, for on-device data
 * that's sensitive but too large/frequent-write for expo-secure-store (e.g. long-form
 * drafts). Unlike `mmkvStorage`, this instance's file is AES-256 encrypted with a key
 * held in the platform Keychain/Keystore.
 */
export const encryptedMmkvStorage = {
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
