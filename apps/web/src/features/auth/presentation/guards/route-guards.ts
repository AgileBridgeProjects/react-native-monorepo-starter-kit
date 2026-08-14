import { lastVisitedPath } from '@lib/last-visited-path';
import type { AuthUser } from '@starterkit/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Context available to every route guard.
 * Passed in after the Firebase auth store has hydrated.
 */
export interface GuardContext {
  isAuthenticated: boolean;
  user: AuthUser | null;
  permissions: ReadonlySet<string>;
}

/**
 * A route guard function — the Next.js equivalent of an Angular `CanActivate` guard.
 *
 * Returns:
 * - `true`  — guard passes, continue to the next guard (or render)
 * - `string` — guard fails, redirect to the returned path
 *
 * Guards are evaluated in order; the first failing guard wins.
 * Future guards (e.g. `requirePermission`, `requireClub`) compose the same way.
 */
export type RouteGuard = (ctx: GuardContext) => true | string;

// ─── Built-in guards ─────────────────────────────────────────────────────────

/**
 * Requires the user to be authenticated.
 * Redirects unauthenticated users to `/login`.
 */
export const requireAuth: RouteGuard = ({ isAuthenticated }) => isAuthenticated || '/login';

/**
 * Requires the user to be unauthenticated (public routes: login).
 * Redirects already-authenticated users to their last visited page, falling
 * back to `/` when no stored path exists (first login, or deliberate sign-out).
 */
export const requirePublic: RouteGuard = ({ isAuthenticated }) => {
  if (!isAuthenticated) return true;
  return lastVisitedPath.consume() ?? '/';
};

/**
 * Requires the user to belong to a club (have a `clubId` claim).
 * Redirects club-less users to `/no-club`.
 * Used after `requireAuth` — assumes the user is already authenticated.
 */
export const requireClub: RouteGuard = ({ user }) => user?.clubId != null || '/no-club';

/**
 * Requires the user to hold a specific permission.
 * Redirects to the provided path when missing.
 */
export const requirePermission = (permission: string, redirectTo: string): RouteGuard => {
  return ({ permissions }) => (permissions.has(permission) ? true : redirectTo);
};

/**
 * Route prefixes that are publicly accessible (no authentication required).
 * Used by `ClientProviders` to select the correct root-level guard.
 * Public routes skip `requireAuth` and render without the authenticated shell.
 *
 * `/maintenance` is included so the deploy-time maintenance page (the middleware
 * rewrites every route to it when MAINTENANCE_MODE is on) renders full-screen
 * without the authenticated sidebar shell and without gating on auth.
 */
export const PUBLIC_ROUTE_PREFIXES = [
  '/login',
  '/forgot-password',
  '/setup-account',
  '/maintenance',
] as const;
