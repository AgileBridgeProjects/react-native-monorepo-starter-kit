import { createGuardedLocalStorageAdapter } from '@lib/storage/guarded-local-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * Web-safe storage adapter backed by localStorage.
 *
 * Use for NON-SENSITIVE data only (app preferences, onboarding state, UI flags).
 */
export const mmkvStorage: StateStorage = createGuardedLocalStorageAdapter();
