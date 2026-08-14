'use client';

import { AuthInitializer } from '@features/auth/presentation/components/auth-initializer';
import { PortalRoleGuard } from '@features/auth/presentation/components/portal-role-guard';
import { RequireAuth } from '@features/auth/presentation/components/require-auth';
import { RouteTracker } from '@features/auth/presentation/components/route-tracker';
import { SessionManagerProvider } from '@features/auth/presentation/components/session-manager-provider';
import {
  PUBLIC_ROUTE_PREFIXES,
  requireAuth,
} from '@features/auth/presentation/guards/route-guards';
import { usePathname } from 'next/navigation';

interface ClientProvidersProps {
  children: React.ReactNode;
}

/**
 * Client-side provider wrapper mounted in the root layout.
 *
 * Mounts `AuthInitializer` (auth state subscriber) and `RequireAuth`
 * (client-side route guard executor) once at the root. Both require client
 * context (hooks, auth SDK) so they cannot live in the Server Component
 * root layout directly.
 *
 * Route guard strategy
 * ─────────────────────
 * PUBLIC_ROUTE_PREFIXES (defined in route-guards.ts) lists the unauthenticated
 * routes: /login, /forgot-password, /setup-account, and /maintenance.
 *
 * Public routes  → guards=[], showLayout=false  (render immediately, no sidebar).
 *   /login additionally has its own layout.tsx that runs requirePublic so that
 *   already-authenticated users are redirected to / before the login form shows.
 *
 * All other routes → guards=[requireAuth], showLayout=true  (gate + sidebar).
 *
 * The list lives in route-guards.ts (not here) so it stays co-located with the
 * guard functions and is the single source of truth for public-route knowledge.
 */
export function ClientProviders({ children }: ClientProvidersProps) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <>
      <AuthInitializer />
      <PortalRoleGuard />
      <SessionManagerProvider />
      {!isPublicRoute && <RouteTracker />}
      <RequireAuth guards={isPublicRoute ? [] : [requireAuth]} showLayout={!isPublicRoute}>
        {children}
      </RequireAuth>
    </>
  );
}
