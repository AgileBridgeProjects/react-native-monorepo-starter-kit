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
   * Whether the caller holds the given permission (e.g. `'StarterKit.CheckIns.Access'`).
   * Resolved from `GET /api/auth/me` after sign-in — mirrors the web portal's
   * `requirePermission` route guard. Returns `false` until permissions have loaded.
   */
  hasPermission: (permission: string) => boolean;
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
 * if (!isAuthenticated) return <Redirect href="/login" />;
 */
export function useCurrentSession(): CurrentSession {
  const { user, isAuthenticated, permissions } = useAuthStore();

  return {
    isAuthenticated,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    displayName: user?.name ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    clubId: user?.clubId ?? null,
    hasPermission: (permission) => permissions.has(permission),
  };
}
