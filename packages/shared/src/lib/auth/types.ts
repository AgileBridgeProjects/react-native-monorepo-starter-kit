/**
 * Shared auth domain types.
 *
 * Single source of truth for the user shape used by both apps/expo (game players)
 * and apps/web (club admins). Both authenticate against the same Firebase project
 * and share the same multi-tenant `club_id` custom claim.
 */

export interface AuthUser {
  /** Firebase UID — the user's internal client-side identifier. */
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  /**
   * The user's club ID from the Firebase `club_id` custom claim.
   * Populated during auth initialisation once the Firebase ID token is decoded.
   */
  clubId?: string;
}

export interface AuthState {
  user: AuthUser | null;
  idToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

export interface AuthActions {
  setAuth: (user: AuthUser, idToken: string) => void;
  setHydrated: (hydrated: boolean) => void;
  logout: () => void;
}
