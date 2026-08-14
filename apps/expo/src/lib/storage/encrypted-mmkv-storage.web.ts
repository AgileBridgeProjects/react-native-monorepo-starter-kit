import { createGuardedLocalStorageAdapter } from '@lib/storage/guarded-local-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * Web fallback for `encryptedMmkvStorage` — MMKV encryption and the platform
 * Keychain/Keystore are both native-only. Falls back to `localStorage`, same as
 * `mmkvStorage.web.ts`; the browser sandbox is the only isolation available here.
 */
export const encryptedMmkvStorage: StateStorage = createGuardedLocalStorageAdapter();
