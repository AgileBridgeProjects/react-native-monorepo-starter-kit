import {
  beginAuthResolution,
  isLatestAuthResolution,
  resolveOrganisationContext,
} from '@features/auth/presentation/hooks/use-finalize-auth-session';
import { crashReporter } from '@lib/crash-reporting';
import { supabase } from '@lib/supabase/config';
import { useAuthStore } from '@store/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToAuth } from '@starterkit/shared';
import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * How long boot may wait on auth + org I/O before rendering anyway. Long enough
 * that a healthy network still gets the "land directly on the right screen"
 * behaviour described below; short enough that a stall doesn't read as a hang.
 */
const HYDRATION_WATCHDOG_MS = 5_000;

/**
 * Subscribes to Supabase (GoTrue) auth state changes, resolves the user's org
 * list, then hydrates the Zustand auth store.
 *
 * Hydration (`setHydrated`) is intentionally deferred until AFTER the org list
 * has been fetched and pre-populated into the React Query cache. This ensures
 * the app only renders once the club context is already known:
 * - Single-org users land directly on the home screen (no intermediate skeleton).
 * - Multi-org users land directly on the org picker (no home screen flash).
 *
 * ...but that deferral is bounded by {@link HYDRATION_WATCHDOG_MS}, because
 * `isHydrated` gates the ENTIRE app: until it flips, app/_layout renders only a
 * spinner on the dark background, which on a device is indistinguishable from a
 * black screen. Two paths used to be able to leave it false forever:
 *
 * 1. The org fetch below settling never. Its axios timeout only starts once the
 *    request is in flight — the interceptor that awaits a fresh Supabase token
 *    runs first and is itself unbounded, so a stalled token/storage read hangs
 *    the whole boot.
 * 2. `subscribeToAuth` early-returning when an explicit sign-in owns the
 *    transition (auth-transition-guard): neither `onAuthenticated` nor
 *    `onUnauthenticated` fires, and this app's `onSettled` is a no-op.
 *
 * The watchdog makes both harmless: worst case the app boots to the auth group or to a
 * tabs skeleton, and org state lands a moment later — never a dead black screen. It only
 * ever fires for the BOOT sequence: it is cancelled the moment auth settles, because
 * otherwise a timer armed at launch would still be pending when the user signed in a few
 * seconds later and would clear `isResolvingOrg` out from under an in-flight org lookup,
 * entering the app with no club context — the very thing `(auth)/_layout` promises can't
 * happen.
 *
 * Token refresh is handled by supabase-js `autoRefreshToken` — no manual timer.
 * Because autoRefreshToken only ticks while the app is foregrounded, we wire it
 * to AppState so refresh starts/stops with the app's foreground state.
 *
 * Returns null — render-nothing component.
 */
export function AuthInitializer() {
  const { setAuth, logout, setHydrated, setActiveOrg, setResolvingOrg, setPermissions } =
    useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    // ── DEV AUTH BYPASS ──────────────────────────────────────────────────────
    // Temporary: while real auth (Firebase vs Supabase) is undecided, setting
    // EXPO_PUBLIC_BYPASS_AUTH=true skips Firebase entirely and seeds a fake
    // authenticated session so the app boots straight into the tabs. Remove this
    // block (and the env flag) once auth is wired up.
    if (process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true') {
      const DEV_CLUB_ID = '00000000-0000-0000-0000-000000000010';
      setAuth(
        { id: 'dev-user', email: 'dev@starterkit.local', name: 'Dev User', clubId: DEV_CLUB_ID },
        'dev-bypass-token',
      );
      setActiveOrg(DEV_CLUB_ID);
      setPermissions(new Set());
      setResolvingOrg(false);
      setHydrated(true);
      return;
    }

    // Boot watchdog — see the note on HYDRATION_WATCHDOG_MS.
    let hydrationWatchdog: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      hydrationWatchdog = undefined;
      // Guard the write: `setHydrated` is idempotent but `setResolvingOrg(false)` is not —
      // it is a destructive write to a flag this timer does not own. Without the check, a
      // boot timer that outlived a fast hydration would cancel a later sign-in's org
      // resolution mid-flight.
      if (useAuthStore.getState().isHydrated) return;
      setHydrated(true);
      setResolvingOrg(false);
    }, HYDRATION_WATCHDOG_MS);

    /** Boot is over — the watchdog has no further business running. */
    const cancelWatchdog = () => {
      if (hydrationWatchdog) clearTimeout(hydrationWatchdog);
      hydrationWatchdog = undefined;
    };

    // supabase-js autoRefreshToken only runs while the app is foregrounded. Start
    // it now (the app is active when this mounts) and toggle it on AppState.
    supabase.auth.startAutoRefresh();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    const unsubscribe = subscribeToAuth(supabase, {
      onAuthenticated: (user, idToken) => {
        cancelWatchdog();

        // Supabase re-emits on every token refresh, not just sign-in. Re-entering the
        // resolving state on a refresh would flip `isResolvingOrg` back to true mid-session,
        // which reshuffles the root navigator and left it with no settled screen (a black
        // screen on device). So an established session only takes the token from here.
        //
        // Keyed on the USER, not on `activeClubId`. Requiring a club meant any session whose
        // org lookup had failed — or been cut short — never matched, so every hourly refresh
        // took the full path below and re-triggered that same flip-flop, for exactly the
        // users most likely to be suffering from it.
        //
        // This short-circuit and the beginAuthResolution token below solve adjacent halves of
        // the same problem and are both kept: this one stops a refresh from starting a
        // resolution at all, the token stops a resolution that DID start from applying a
        // stale result. Neither subsumes the other.
        const current = useAuthStore.getState();
        const isSameSession = current.isAuthenticated && current.user?.id === user.id;
        if (isSameSession) {
          setAuth(user, idToken);
          setHydrated(true);
          // A session still missing its club needs one, but resolving it out of band keeps
          // `isResolvingOrg` untouched: the navigator stays put and the club lands quietly.
          if (!current.activeClubId) {
            // Tokened like every other resolution — this one cannot clobber `isResolvingOrg`
            // (it never sets it), but it CAN set a club, so a superseded run must not.
            const refreshToken = beginAuthResolution();
            void resolveOrganisationContext({
              user,
              queryClient,
              setActiveOrg: (clubId) => {
                if (isLatestAuthResolution(refreshToken)) setActiveOrg(clubId);
              },
              setPermissions: (permissions) => {
                if (isLatestAuthResolution(refreshToken)) setPermissions(permissions);
              },
            }).catch(() => {
              // Already surfaced by the org query itself; a refresh must not tear down a
              // working session just because this retry failed.
            });
          }
          return;
        }

        const token = beginAuthResolution();
        setResolvingOrg(true);
        setAuth(user, idToken);

        // Fetch the org list before hydrating. Pre-populating the React Query
        // cache here means (tabs)/_layout sees orgsLoaded=true on its first
        // render, so it can immediately route to the right destination.
        //
        // This SIGNED_IN event also fires for sign-ins already handled by an
        // explicit useFinalizeAuthSession call (login/OTP/Apple/etc, which use
        // the same beginAuthResolution token to coordinate) — only the latest
        // resolution is allowed to apply, so a stale run here can't clobber
        // state after the explicit flow already settled and navigated.
        resolveOrganisationContext({
          user,
          queryClient,
          setActiveOrg: (clubId) => {
            if (isLatestAuthResolution(token)) setActiveOrg(clubId);
          },
          setPermissions: (permissions) => {
            if (isLatestAuthResolution(token)) setPermissions(permissions);
          },
        }).finally(() => {
          if (isLatestAuthResolution(token)) {
            setResolvingOrg(false);
            setHydrated(true);
          }
        });
      },
      onUnauthenticated: () => {
        cancelWatchdog();
        queryClient.clear();
        crashReporter.setUserId(null);
        logout();
        setHydrated(true);
      },
      // Hydration is managed by the callbacks above — authenticated waits for
      // org resolution, unauthenticated hydrates immediately.
      onSettled: () => {},
    });

    return () => {
      cancelWatchdog();
      unsubscribe();
      appStateSubscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [setAuth, logout, setHydrated, setActiveOrg, setResolvingOrg, setPermissions, queryClient]);

  return null;
}
