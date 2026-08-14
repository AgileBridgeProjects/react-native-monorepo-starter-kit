import { useLogout } from '@features/auth/presentation/hooks/use-auth';
import {
  useOrganisations,
  useOrgSwitch,
} from '@features/auth/presentation/hooks/use-organisations';
import { useAuthStore } from '@store/auth-store';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GradientBackground, Skeleton } from '@/components/ui';
import { LiquidGlassTabLayout } from '@/components/ui/liquid-glass-tab-layout';
import { ApiError } from '@/src/lib/http/api-error';
import { getApiAuthMe } from '@/src/proxy/services/auth/auth';

export default function AppLayout() {
  const { isAuthenticated, user, idToken, setAuth, activeClubId } = useAuthStore();
  const { mutate: logout } = useLogout();
  const router = useRouter();
  // null = still resolving, true = confirmed not linked (real 403)
  const [notLinked, setNotLinked] = useState<boolean | null>(user?.clubId ? false : null);

  useEffect(() => {
    // Fast path: clubId already in store — nothing to resolve.
    if (user?.clubId) {
      setNotLinked(false);
      return;
    }
    if (!isAuthenticated || !user || !idToken) return;

    // First-time Google/SSO sign-in: the Firebase token has no club_id claim yet
    // because the RoleClaimsTransformer hasn't had a chance to set it. Call /api/auth/me
    // which runs the transformer on the backend (links the UID by email, sets the Firebase
    // custom claim). On success, patch the store user so the layout can continue.
    getApiAuthMe()
      .then((me) => {
        if (me.clubId) {
          setAuth({ ...user, clubId: me.clubId }, idToken);
          setNotLinked(false);
        } else {
          setNotLinked(true);
        }
      })
      .catch((err) => {
        // Real 403 → genuinely not linked. Any other error → treat as not linked
        // to avoid an infinite loading state, but user can try logging out/in.
        if (err instanceof ApiError && err.isForbidden) {
          setNotLinked(true);
        } else {
          setNotLinked(true);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, idToken, setAuth]);

  // Safety net: the sign-in hooks block unregistered users before they reach
  // this point, but if somehow a user without a club arrives here, sign
  // them out immediately and return to login.
  useEffect(() => {
    if (notLinked === true) {
      logout();
      router.replace('/(auth)/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notLinked, logout, router]);

  // Fetch linked orgs once club is resolved (data lives in React Query cache).
  const {
    data: orgs,
    isSuccess: orgsLoaded,
    isError: orgsFailed,
  } = useOrganisations(notLinked === false);
  const switchOrg = useOrgSwitch();
  const setActiveOrg = useAuthStore((s) => s.setActiveOrg);

  // Single-org users: silently auto-select without showing the picker at all.
  useEffect(() => {
    if (!orgsLoaded || activeClubId !== null) return;
    if (orgs?.length === 1) {
      switchOrg(orgs[0].clubId);
    }
  }, [orgsLoaded, orgs, activeClubId, switchOrg]);

  // Fallback: if the org list fails to load, use the Firebase token's clubId so
  // the app can still render rather than staying stuck on the skeleton indefinitely.
  useEffect(() => {
    if (orgsFailed && activeClubId === null && user?.clubId) {
      setActiveOrg(user.clubId);
    }
  }, [orgsFailed, activeClubId, user?.clubId, setActiveOrg]);

  const needsOrgPick = orgsLoaded && (orgs?.length ?? 0) > 1 && activeClubId === null;

  useEffect(() => {
    if (needsOrgPick) {
      router.replace('/select-org' as Href);
    }
  }, [needsOrgPick, router]);

  // Unauthenticated users never reach this group: the root layout renders nothing until
  // auth is hydrated, and `(auth)/_layout` redirects an authenticated session away from
  // Sign-In. A `Stack.Protected` guard was tried here instead and had to be reverted —
  // in expo-router 56 it EXCLUDES the guarded route rather than redirecting, so the
  // login screen had no route to render and the app went black on sign-in.

  if (!user?.clubId && notLinked === null) {
    return <LayoutSkeleton />;
  }

  if (!user?.clubId && notLinked === true) {
    return null;
  }

  // Org data is pre-populated by AuthInitializer before hydration completes,
  // so orgsLoaded is true on the first render in the normal sign-in flow.
  // The fallback (!orgsLoaded) guard covers edge cases (first-time SSO users
  // whose club claim isn't set yet, or very slow networks).
  if ((!orgsLoaded && !orgsFailed && activeClubId === null) || needsOrgPick) {
    return <LayoutSkeleton />;
  }

  return (
    <View style={{ flex: 1 }}>
      <LiquidGlassTabLayout />
    </View>
  );
}

function LayoutSkeleton() {
  return (
    <GradientBackground className="px-lg pt-2xl">
      <Skeleton className="mb-lg h-9 w-1/2" />
      <Skeleton shape="card" className="mb-md h-32 w-full" />
      <Skeleton shape="card" className="mb-md h-32 w-full" />
      <Skeleton shape="card" className="h-32 w-full" />
    </GradientBackground>
  );
}
