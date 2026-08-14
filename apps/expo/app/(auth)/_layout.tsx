import { useAuthStore } from '@store/auth-store';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

/**
 * Auth route group layout.
 *
 * Redirects signed-in users into the app from here, rather than leaving it to a
 * `Stack.Protected` guard on this group in the root layout. In expo-router 56 a
 * failed guard EXCLUDES its screens from the navigator without redirecting
 * anywhere (`withLayoutContext`: `excludeChildren = exclude || !guard`) — so
 * guarding this group meant that the instant a sign-in flipped it, `/login` was
 * deleted while the navigation state still pointed at it, leaving the navigator
 * with no route to render. That was the black screen that only a reload cleared.
 *
 * Keeping the screens registered and redirecting from here is what our other production apps do on
 * the same expo-router version, which is why it has never bitten there. The
 * authenticated group stays guarded in the root layout — that direction is safe,
 * because signing out always has a mounted `/login` to land on.
 *
 * `isResolvingOrg` holds the redirect until the club/org lookup that follows a
 * sign-in settles, so the app is never entered without a club context.
 */
export default function AuthLayout() {
  const { isAuthenticated, isHydrated, isResolvingOrg } = useAuthStore();

  // Nothing resolved yet — the native splash still covers this window (see app/_layout),
  // so render nothing rather than flashing the login form at someone who turns out to have
  // a valid session.
  if (!isHydrated) return null;

  // Authenticated, but the club lookup is still in flight. Must NOT fall through to the
  // Stack below: a mid-session token refresh for a user without a club re-enters this state
  // with `isHydrated` already true, and the fall-through put a signed-in user on a live
  // Sign-In form they could submit again.
  //
  // A spinner rather than `null`, because by this point the splash is gone — an empty view
  // here is indistinguishable from the black screen this whole layout exists to fix, and the
  // window is as long as the org request takes. Bounded by HYDRATION_WATCHDOG_MS at boot.
  if (isAuthenticated && isResolvingOrg) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-blue-screen">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="otp-verify" />
      <Stack.Screen name="setup-account" />
    </Stack>
  );
}
