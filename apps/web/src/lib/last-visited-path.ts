const STORAGE_KEY = 'starterkit-last-visited';

const EXCLUDED_PREFIXES = ['/login', '/forgot-password', '/setup-account', '/no-club'];

function isStorable(path: string): boolean {
  return !EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// Module-level cache so consume() returns the same value however many times it's
// called within a single page load. React Strict Mode double-invokes effects in
// development — without this, the second invocation would see an empty localStorage
// (already cleared by the first) and fall back to '/' instead of the stored path.
// A hard redirect (window.location.href) resets all module state, so this is safe.
let _consumed: string | null | undefined;

/**
 * Persists the admin's last visited route across session expiry.
 *
 * Saved on every route change (for authenticated routes only).
 * Consumed once on post-login redirect — idempotent per page load.
 * Cleared explicitly on deliberate sign-out so that voluntary logouts
 * do not restore the previous location.
 */
export const lastVisitedPath = {
  save(path: string): void {
    if (!isStorable(path)) return;
    localStorage.setItem(STORAGE_KEY, path);
  },

  /**
   * Reads the stored path, removes it from localStorage, and caches the result
   * for the rest of the page load. Idempotent: subsequent calls return the same
   * value without touching localStorage again.
   */
  consume(): string | null {
    if (_consumed !== undefined) return _consumed;
    const raw = localStorage.getItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    // Reject anything that isn't a plain internal path.
    _consumed = raw?.startsWith('/') && !raw.startsWith('//') ? raw : null;
    return _consumed;
  },

  clear(): void {
    _consumed = undefined;
    localStorage.removeItem(STORAGE_KEY);
  },
};
