import type { Href, useRouter } from 'expo-router';
import { InteractionManager } from 'react-native';

/**
 * Navigates into the app after a successful sign-in.
 *
 * Deferred rather than called inline because a sign-in flips the root layout's
 * `Stack.Protected` guard on the authenticated group (tabs, onboarding, detail screens).
 * Navigating in the same tick targets a route the navigator hasn't registered yet, so the
 * navigation is dropped. `runAfterInteractions` lets React commit that change first — the
 * same reason the drawer defers its pushes past the modal dismiss animation.
 *
 * Deliberately a belt-and-braces measure, NOT the load-bearing fix. It buys one frame,
 * whereas the guard also depends on `isResolvingOrg`, which only clears when a network
 * round trip settles — far longer than a frame. What actually guarantees arrival is the
 * `<Redirect href="/">` in `app/(auth)/_layout.tsx`, which fires once that resolution
 * completes. Keeping the deferral still avoids a wasted navigation and the accompanying
 * warning on the fast path.
 *
 * (An earlier version of this note claimed the `(auth)` group is guarded too and
 * "disappears" on sign-in. It isn't — it is deliberately left unguarded, precisely so
 * `/login` is never deleted out from under the navigator. See that layout's docblock.)
 *
 * Use this for every navigation that immediately follows becoming authenticated — the
 * destination may be the app root or a role's onboarding flow, but both live behind the
 * guard that is flipping.
 */
export function navigateToAppRoot(router: ReturnType<typeof useRouter>, href: Href = '/'): void {
  InteractionManager.runAfterInteractions(() => router.replace(href));
}
