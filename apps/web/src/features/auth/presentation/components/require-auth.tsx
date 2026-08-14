'use client';

import { useAuthStore } from '@store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLoading, Layout } from '@/components/ui';
import type { RouteGuard } from '../guards/route-guards';

interface RequireAuthProps {
  children: React.ReactNode;
  /**
   * Guards to run in order after auth state hydrates.
   *
   * Each guard returns `true` (pass) or a redirect path (fail). Guards are
   * evaluated sequentially — the first failing guard redirects and stops
   * evaluation. This mirrors Angular's `CanActivate` chain.
   *
   * @example
   * // Protected route — must be logged in AND belong to a club
   * guards={[requireAuth, requireClub]}
   *
   * // Public route — redirect authenticated users away
   * guards={[requirePublic]}
   */
  guards?: RouteGuard[];
  /**
   * When true, the sidebar Layout is rendered around children.
   * Set to false for public/unauthenticated routes (login, register, etc.).
   */
  showLayout?: boolean;
}

/**
 * Client-side route guard executor.
 *
 * Waits for the Firebase auth state to hydrate (via AuthInitializer), then
 * runs the provided guards in order. The first failing guard triggers a
 * redirect; subsequent guards are skipped.
 *
 * This approach is used instead of Next.js middleware because Firebase auth
 * sessions are managed in browser indexedDB (not httpOnly cookies), making
 * them unavailable in the Edge runtime that middleware runs in.
 */
export function RequireAuth({ children, guards = [], showLayout = true }: RequireAuthProps) {
  const { isAuthenticated, isHydrated, user, portalRoleVerified, permissions } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated || guards.length === 0) return;

    // Don't evaluate guards until the portal role check completes.
    // Without this, requirePublic redirects away from /login before we know
    // whether the cached session is actually authorised — causing a visible
    // redirect loop (login → / → login).
    if (isAuthenticated && !portalRoleVerified) return;

    const ctx = { isAuthenticated, user, permissions };

    for (const guard of guards) {
      const result = guard(ctx);
      if (result !== true) {
        router.replace(result);
        return;
      }
    }
  }, [isHydrated, isAuthenticated, user, permissions, guards, router, portalRoleVerified]);

  // ── Render gates ──────────────────────────────────────────────────────────
  //
  // Public routes (showLayout=false): always render children immediately so
  // the login / register form is visible while Firebase hydrates.
  //
  // Protected routes (showLayout=true): render nothing until ALL of:
  //   1. Firebase has hydrated  (isHydrated)
  //   2. The user is authenticated  (isAuthenticated)
  //   3. The portal role check passed  (portalRoleVerified)
  // This prevents every possible flicker — including the one-frame flash
  // of the admin shell that occurs between signOut and router.replace.

  if (!showLayout) return <>{children}</>;

  if (!isHydrated || !isAuthenticated || !portalRoleVerified) return <AppLoading />;

  return <Layout>{children}</Layout>;
}
