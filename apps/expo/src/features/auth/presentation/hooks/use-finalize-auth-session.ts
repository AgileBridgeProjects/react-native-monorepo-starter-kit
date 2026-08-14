import { crashReporter } from '@lib/crash-reporting';
import { useAuthStore } from '@store/auth-store';
import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { AccountNotFoundFailure, type AuthUser, authTransitionGuard } from '@starterkit/shared';
import { useCallback } from 'react';

import { meDatasource } from '../../infrastructure/datasources/me.datasource';
import { organisationsDatasource } from '../../infrastructure/datasources/organisations.datasource';
import { SupabaseAuthDatasource } from '../../infrastructure/datasources/supabase-auth.datasource';
import { ORGANISATIONS_QUERY_KEY } from './use-organisations';

const authDataSource = new SupabaseAuthDatasource();

interface ResolveOrganisationContextParams {
  user: AuthUser;
  queryClient: QueryClient;
  setActiveOrg: (clubId: string) => void;
  setPermissions: (permissions: ReadonlySet<string>) => void;
}

/** HTTP statuses the org lookup returns when the IdP user has no linked StarterKit account. */
const NO_ACCOUNT_STATUSES = new Set([403, 404]);

/**
 * Every sign-in (password, OTP, Apple, Google, Microsoft) fires Supabase's
 * `onAuthStateChange` SIGNED_IN event, which `AuthInitializer` picks up and
 * resolves independently of the explicit `useFinalizeAuthSession` call the
 * sign-in hook below also makes for the same event. Both run
 * `resolveOrganisationContext` concurrently; without coordination, whichever
 * finishes last "wins" — including a stale run finishing after the fresher one
 * already flipped `isResolvingOrg` back to false and the app navigated past the
 * auth guard, which reopens the guard with nothing mounted (black screen) until
 * a manual reload. `beginAuthResolution`/`isLatestAuthResolution` let only the
 * most recently started resolution apply its result.
 */
let authResolutionSeq = 0;
export function beginAuthResolution(): number {
  return ++authResolutionSeq;
}
export function isLatestAuthResolution(token: number): boolean {
  return token === authResolutionSeq;
}

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

/** Best-effort — a failed permissions fetch must never block sign-in; the caller just gates as if permission-less until the next successful resolution (foreground refresh, next sign-in). */
async function syncPermissions(setPermissions: (permissions: ReadonlySet<string>) => void) {
  try {
    const me = await meDatasource.getMe();
    setPermissions(new Set(me.permissions));
  } catch {
    setPermissions(new Set());
  }
}

export async function resolveOrganisationContext({
  user,
  queryClient,
  setActiveOrg,
  setPermissions,
}: ResolveOrganisationContextParams) {
  let orgs: Awaited<ReturnType<typeof organisationsDatasource.getLinkedOrganisations>>;
  try {
    // Run concurrently, not sequentially — but both must settle before this function
    // returns, so a caller gating on "resolution complete" (e.g. the app-open check-in
    // gate, which enables once org state settles) never observes org state without
    // permissions alongside it.
    [orgs] = await Promise.all([
      organisationsDatasource.getLinkedOrganisations(),
      syncPermissions(setPermissions),
    ]);
  } catch (err) {
    // 403/404 = authenticated with the provider but no linked StarterKit account/club.
    if (NO_ACCOUNT_STATUSES.has(statusOf(err) ?? 0)) {
      throw new AccountNotFoundFailure();
    }
    // Transient/other error: fall back to the token's home org if we have one.
    if (user.clubId) setActiveOrg(user.clubId);
    return;
  }

  // Authenticated, but not linked to any club.
  if (orgs.length === 0 && !user.clubId) {
    throw new AccountNotFoundFailure();
  }

  queryClient.setQueryData(ORGANISATIONS_QUERY_KEY, orgs);
  if (orgs.length === 1) {
    setActiveOrg(orgs[0].clubId);
  }
}

export function useFinalizeAuthSession() {
  const { setAuth, setActiveOrg, setResolvingOrg, setPermissions, logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useCallback(
    async (user: AuthUser, idToken: string) => {
      const token = beginAuthResolution();
      setResolvingOrg(true);
      setAuth(user, idToken);
      crashReporter.setUserId(user.id);

      try {
        await resolveOrganisationContext({
          user,
          queryClient,
          setActiveOrg: (clubId) => {
            if (isLatestAuthResolution(token)) setActiveOrg(clubId);
          },
          setPermissions: (permissions) => {
            if (isLatestAuthResolution(token)) setPermissions(permissions);
          },
        });
      } catch (err) {
        // No StarterKit account: tear the session back down so the user stays on login
        // with a clear message instead of being dropped on Home with a broken state.
        if (err instanceof AccountNotFoundFailure) {
          await authDataSource.logout().catch(() => {});
          logout();
          crashReporter.setUserId(null);
        }
        throw err;
      } finally {
        if (isLatestAuthResolution(token)) setResolvingOrg(false);
        // Only now is this sign-in fully resolved — let AuthInitializer's listener
        // process any later, unrelated auth event again (see auth-transition-guard.ts).
        authTransitionGuard.inProgress = false;
      }
    },
    [setAuth, setActiveOrg, setResolvingOrg, setPermissions, logout, queryClient],
  );
}
