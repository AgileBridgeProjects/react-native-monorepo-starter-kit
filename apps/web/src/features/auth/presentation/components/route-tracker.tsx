'use client';

import { lastVisitedPath } from '@lib/last-visited-path';
import { useAuthStore } from '@store/auth-store';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Tracks the current pathname and persists it so the admin can be restored
 * to their last location after a session-expiry re-login.
 *
 * Mounted inside ClientProviders only for authenticated (non-public) routes.
 *
 * The isAuthenticated guard prevents the logout flow from overwriting the
 * saved path — clearWorkspace() can trigger a navigation to /clubs while
 * auth is already cleared, and we don't want that intermediate route saved.
 */
export function RouteTracker() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) return;
    lastVisitedPath.save(pathname);
  }, [pathname, isAuthenticated]);

  return null;
}
