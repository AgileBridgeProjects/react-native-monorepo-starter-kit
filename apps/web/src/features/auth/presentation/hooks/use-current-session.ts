import { useAuthStore } from '@store/auth-store';

/**
 * The typed shape returned by `useCurrentSession()`.
 *
 * Mirrors the backend `ICurrentSession` interface so both layers share the same
 * conceptual model. Analogous to ABP's `ICurrentUser`.
 */
export interface CurrentSession {
  /** Whether a user is currently authenticated. */
  isAuthenticated: boolean;
  /**
   * The user's Firebase UID (their internal client-side identifier).
   * Corresponds to `FirebaseUid` on the backend session.
   */
  userId: string | null;
  /** The user's email address. */
  email: string | null;
  /** The user's display name. */
  displayName: string | null;
  /** The user's avatar URL. */
  avatarUrl: string | null;
  /**
   * The user's club ID from the Firebase `club_id` custom claim.
   * Populated once the auth store is seeded with the decoded token claims.
   * Will be `null` until Firebase ID token claims are read.
   */
  clubId: string | null;
  /**
   * Returns `true` if the current user holds the given permission key.
   * Permissions are resolved server-side and cached in the auth store by
   * `PortalRoleGuard` on first load.
   *
   * @example
   * const { hasPermission } = useCurrentSession();
   * if (!hasPermission('StarterKit.Users.Manage')) return <Forbidden />;
   */
  hasPermission: (key: string) => boolean;
  /** Role names confirmed by /api/auth/me (e.g. ["SuperAdmin"]). */
  roles: string[];
}

/**
 * Returns session details for the currently authenticated user.
 *
 * Use this hook anywhere you need to know who is logged in — profile headers,
 * permission gates, scoping API calls — without calling the backend or reading
 * the store directly.
 *
 * @example
 * const { isAuthenticated, userId, clubId, displayName } = useCurrentSession();
 * if (!isAuthenticated) redirect('/login');
 */
export function useCurrentSession(): CurrentSession {
  const { user, isAuthenticated, userRoles, resolvedClubId } = useAuthStore();
  const permissions = useAuthStore((s) => s.permissions);

  return {
    isAuthenticated,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    displayName: user?.name ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    clubId: resolvedClubId,
    hasPermission: (key: string) => permissions.has(key),
    roles: userRoles,
  };
}
