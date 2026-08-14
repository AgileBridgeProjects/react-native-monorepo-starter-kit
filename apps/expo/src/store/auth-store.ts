import type { AuthUser } from '@starterkit/shared';
import { create } from 'zustand';

interface AuthState {
  user: AuthUser | null;
  idToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isResolvingOrg: boolean;
  /**
   * The org the user has explicitly selected for this session. `null` means
   * "not yet picked" — multi-org users land on the select-org screen while this
   * is null; single-org users have no picker, and requests fall back to the
   * Firebase token's home org. Distinct from `user.clubId`, which is the
   * identity claim from the auth token.
   */
  activeClubId: string | null;
  /**
   * The caller's permission set, resolved from `GET /api/auth/me`. Empty until the
   * first successful resolution after sign-in. Mirrors the web portal's
   * `apps/web/src/store/auth-store.ts` permissions field so both clients share the
   * same permission-gating model.
   */
  permissions: ReadonlySet<string>;
}

interface AuthActions {
  setAuth: (user: AuthUser, idToken: string) => void;
  setHydrated: (hydrated: boolean) => void;
  setResolvingOrg: (isResolvingOrg: boolean) => void;
  logout: () => void;
  setActiveOrg: (clubId: string) => void;
  setPermissions: (permissions: ReadonlySet<string>) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  // State
  user: null,
  idToken: null,
  isAuthenticated: false,
  isHydrated: false,
  isResolvingOrg: false,
  activeClubId: null,
  permissions: new Set(),

  // Actions
  setAuth: (user, idToken) => set({ user, idToken, isAuthenticated: true }),
  setHydrated: (isHydrated) => set({ isHydrated }),
  setResolvingOrg: (isResolvingOrg) => set({ isResolvingOrg }),
  logout: () =>
    set({
      user: null,
      idToken: null,
      isAuthenticated: false,
      isResolvingOrg: false,
      activeClubId: null,
      permissions: new Set(),
    }),
  setActiveOrg: (clubId) => set({ activeClubId: clubId }),
  setPermissions: (permissions) => set({ permissions }),
}));

/**
 * Non-hook utilities for use outside of React components (e.g. axios interceptors).
 * These access store state directly without subscribing.
 */
export const authStoreUtils = {
  /** @deprecated Use `getIdToken()` instead — both return the same ID token. */
  getAccessToken: (): string | null => useAuthStore.getState().idToken,
  getIdToken: (): string | null => useAuthStore.getState().idToken,
  getActiveClubId: (): string | null => useAuthStore.getState().activeClubId,
  triggerLogout: (): void => useAuthStore.getState().logout(),
};
