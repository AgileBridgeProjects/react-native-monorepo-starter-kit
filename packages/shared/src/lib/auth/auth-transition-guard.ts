/**
 * Set for the duration of an explicit sign-in call (password login, social,
 * phone OTP) that will finalize its own session via `useFinalizeAuthSession`.
 *
 * Supabase fires the matching `SIGNED_IN` event on `onAuthStateChange`
 * *synchronously within* the sign-in call itself (before it returns to the
 * caller) — so without this guard, the app's ambient `subscribeToAuth`
 * listener (`AuthInitializer`) starts its own, independent org-resolution
 * pass for the same sign-in, racing the explicit caller's pass on the same
 * auth-store writes. One pass can finish first and flip `isResolvingOrg`
 * back to `false` while the other is still in flight, leaving the app on an
 * inconsistent club/org state until it's force-closed and reopened.
 *
 * `SupabaseAuthDatasource`'s sign-in methods set this to `true` right before
 * calling into supabase-js; `useFinalizeAuthSession` resets it to `false` in
 * its `finally`, once its own resolution pass has fully settled.
 */
export const authTransitionGuard = { inProgress: false };
