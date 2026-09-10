'use client';

import { ApiError } from '@lib/http/api-error';
import { useTranslation } from '@lib/i18n';
import { supabase } from '@lib/supabase/config';
import { useAuthStore } from '@store/auth-store';
import { useWorkspaceStore } from '@store/workspace-store';
import { useEffect, useRef } from 'react';
import { toast } from '@/components/ui';
import { getApiAuthMe } from '@/proxy/services/auth/auth';

/**
 * Checks whether the authenticated user has a portal-eligible role
 * (any role flagged as IsPortalRole in the database). If not, signs
 * them out and shows a dev-only toast.
 *
 * Sets `portalRoleVerified` in the auth store so RequireAuth can gate
 * rendering of protected content until the check completes — preventing
 * any flicker of the admin portal for unauthorized users.
 */
export function PortalRoleGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const setPortalRoleVerified = useAuthStore((s) => s.setPortalRoleVerified);
  const setPermissions = useAuthStore((s) => s.setPermissions);
  const setUserRoles = useAuthStore((s) => s.setUserRoles);
  const setResolvedClubId = useAuthStore((s) => s.setResolvedClubId);
  const { t } = useTranslation();
  const checkedUid = useRef<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !user) {
      checkedUid.current = null;
      setPortalRoleVerified(false);
      setPermissions([]);
      setResolvedClubId(null);
      return;
    }
    const { resolvedClubId, permissions } = useAuthStore.getState();
    const needsResync = permissions.size === 0 || resolvedClubId == null;
    if (checkedUid.current === user.id && !needsResync) return;
    checkedUid.current = user.id;
    // Reset before the async check so RequireAuth blocks protected content
    // while the new check is in flight (prevents stale-true for a different account).
    setPortalRoleVerified(false);

    getApiAuthMe()
      .then(({ roles, isActive, hasPortalAccess, permissions, clubName, clubId, clubLogoUrl }) => {
        setPermissions(permissions ?? []);
        setResolvedClubId(clubId ?? null);
        const isPlatformAdmin = (permissions ?? []).includes('StarterKit.Platform.Admin');

        // Non-super-admins are tenant-locked: always align workspace to the backend-resolved
        // session club to prevent stale persisted club context from another account.
        if (!isPlatformAdmin) {
          useWorkspaceStore.setState({
            clubId: clubId ?? null,
            clubName: clubName ?? null,
            clubLogoUrl: clubLogoUrl ?? null,
            teamId: null,
            teamName: null,
          });
        } else if (clubName != null && useWorkspaceStore.getState().clubId == null) {
          // Super-admins can impersonate any workspace. Only seed the display name and
          // logo for the workspace-switcher header — no colour fields. Brand colours
          // must come exclusively from an explicit club selection via setClub()
          // (the flyout pick). Seeding colours here would brand the portal even when
          // the admin has not chosen a club, and would re-apply stale colours
          // after logout + re-login.
          useWorkspaceStore.setState({
            clubName,
            clubLogoUrl: clubLogoUrl ?? null,
          });
        }
        if (isActive === false) {
          toast.error(
            process.env.NODE_ENV === 'development'
              ? t('auth:portalAccess.suspendedDev', { email: user.email })
              : t('auth:portalAccess.suspended'),
          );
          supabase.auth.signOut();
          return;
        }

        if (hasPortalAccess) {
          setUserRoles(roles ?? []);
          setPortalRoleVerified(true);
          return;
        }

        // Distinguish: no roles at all = no StarterKit account vs roles exist but none are portal-eligible
        const hasAnyRole = roles && roles.length > 0;
        if (hasAnyRole) {
          toast.error(
            process.env.NODE_ENV === 'development'
              ? t('auth:portalAccess.deniedDev', { email: user.email, roleName: roles[0] })
              : t('auth:portalAccess.denied'),
          );
        } else {
          toast.error(
            process.env.NODE_ENV === 'development'
              ? t('auth:portalAccess.noAccountDev', { email: user.email })
              : t('auth:portalAccess.noAccount', { email: user.email }),
          );
        }
        supabase.auth.signOut();
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.isForbidden) {
          // 403 = no StarterKit account for this Supabase user — permanent, sign out immediately.
          toast.error(
            process.env.NODE_ENV === 'development'
              ? t('auth:portalAccess.noAccountDev', { email: user.email })
              : t('auth:portalAccess.noAccount', { email: user.email }),
          );
          supabase.auth.signOut();
        } else {
          // 401 or any other error — may be a transient token-refresh failure while
          // the user is actively using the portal. Signing out immediately causes the unexplained
          // random-logout symptom. Reset the check flag so the guard retries on the next state
          // change; a genuine revocation will surface through onAuthStateChanged instead.
          toast.error(t('auth:portalAccess.verificationFailed'));
          checkedUid.current = null;
        }
      });
  }, [
    isHydrated,
    isAuthenticated,
    user,
    t,
    setPortalRoleVerified,
    setPermissions,
    setUserRoles,
    setResolvedClubId,
  ]);

  return null;
}
