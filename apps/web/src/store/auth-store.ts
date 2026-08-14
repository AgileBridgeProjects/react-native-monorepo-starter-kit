import type { AuthActions, AuthState, AuthUser } from '@starterkit/shared';
import { create } from 'zustand';
import { queryClient } from '@/lib/http/query-client';
import { useWorkspaceStore } from '@/store/workspace-store';

type AuthStore = AuthState &
  AuthActions & {
    /** True once PortalRoleGuard has confirmed the user has an admin role. */
    portalRoleVerified: boolean;
    setPortalRoleVerified: (verified: boolean) => void;
    /** Resolved permission set for the current user — populated by PortalRoleGuard. */
    permissions: ReadonlySet<string>;
    setPermissions: (permissions: string[]) => void;
    /** Role names returned by /api/auth/me (e.g. ["SuperAdmin"]). */
    userRoles: string[];
    setUserRoles: (roles: string[]) => void;
    /**
     * Club resolved by backend session (/api/auth/me), not token claims.
     * Prevents stale client claims from leaking cross-tenant IDs into requests.
     */
    resolvedClubId: string | null;
    setResolvedClubId: (clubId: string | null) => void;
  };

/**
 * Web auth store — single source of truth for the current user session.
 *
 * Shape mirrors apps/expo/src/store/auth-store.ts exactly. Both apps target
 * the same Firebase project with the same multi-tenant `club_id` custom claim.
 *
 * Intentionally NOT persisted (`zustand/middleware persist` is excluded) —
 * Firebase manages session state via indexedDB browser persistence. The store
 * is hydrated on every page load by <AuthInitializer> once onAuthStateChanged
 * fires. Persisting tokens in localStorage would be an OWASP A07 violation.
 */
export const useAuthStore = create<AuthStore>((set) => ({
  // State
  user: null,
  idToken: null,
  isAuthenticated: false,
  isHydrated: false,
  portalRoleVerified: false,
  permissions: new Set<string>(),
  userRoles: [],
  resolvedClubId: null,

  // Actions
  setAuth: (user: AuthUser, idToken: string) => set({ user, idToken, isAuthenticated: true }),
  setHydrated: (isHydrated: boolean) => set({ isHydrated }),
  setPortalRoleVerified: (verified: boolean) => set({ portalRoleVerified: verified }),
  setPermissions: (permissions: string[]) => set({ permissions: new Set(permissions) }),
  setUserRoles: (userRoles: string[]) => set({ userRoles }),
  setResolvedClubId: (resolvedClubId: string | null) => set({ resolvedClubId }),
  logout: () => {
    queryClient.clear();
    useWorkspaceStore.getState().clearWorkspace();
    set({
      user: null,
      idToken: null,
      isAuthenticated: false,
      portalRoleVerified: false,
      permissions: new Set(),
      userRoles: [],
      resolvedClubId: null,
    });
  },
}));

/**
 * Non-hook utilities for use outside React components (e.g. axios interceptors).
 */
export const authStoreUtils = {
  getIdToken: (): string | null => useAuthStore.getState().idToken,
  triggerLogout: (): void => useAuthStore.getState().logout(),
};
