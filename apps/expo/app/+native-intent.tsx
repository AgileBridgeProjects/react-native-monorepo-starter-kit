/**
 * Expo Router native deep-link interceptor.
 *
 * OAuth redirects come back as custom-scheme deep links (e.g. Google
 * `com.example.starterkit:/oauthredirect?code=…`, Microsoft
 * `starterkit-mobile://auth/microsoft?code=…`).
 * Those codes are consumed by the sign-in hooks' `Linking` listeners (see
 * `use-google-sign-in.ts` / `use-microsoft-sign-in.ts`), NOT by routing. But the same deep
 * links are also handed to Expo Router, which would otherwise navigate to `/oauthredirect`
 * (no route → "Unmatched Route") or to the native-noop `/auth/microsoft` screen — covering
 * the app while sign-in is still completing.
 *
 * Returning `null` tells Expo Router to perform no navigation and stay on the current screen
 * (the login screen, where the sign-in loading overlay is already showing). The user simply
 * waits on that overlay until the token exchange finishes and the auth gate routes them home —
 * no Unmatched Route, and no login-screen flash from bouncing through the root. All other deep
 * links pass through untouched.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  if (path.includes('oauthredirect') || path.includes('auth/microsoft')) return null;
  return path;
}
