import type { StateStorage } from 'zustand/middleware';

/**
 * Shared web `StateStorage` adapter backed by `localStorage`.
 *
 * Guards against SSR / static rendering (Node.js) where window / localStorage
 * are unavailable. Falls back to a no-op in those environments so module
 * evaluation never throws; the Zustand `persist` middleware re-hydrates
 * from storage once the component mounts on the client.
 *
 * Used by both `mmkv-storage.web.ts` and `encrypted-mmkv-storage.web.ts` — the
 * browser sandbox is the only isolation available on web for either case.
 */
export function createGuardedLocalStorageAdapter(): StateStorage {
  return {
    getItem: (name: string): string | null => {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(name);
    },
    setItem: (name: string, value: string): void => {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(name, value);
    },
    removeItem: (name: string): void => {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(name);
    },
  };
}
