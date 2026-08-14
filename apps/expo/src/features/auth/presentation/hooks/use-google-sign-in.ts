import { useMutation } from '@tanstack/react-query';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { logAuthError } from '@/src/lib/auth-error-logger';

import { SupabaseAuthDatasource } from '../../infrastructure/datasources/supabase-auth.datasource';
import { useFinalizeAuthSession } from './use-finalize-auth-session';

/** How long to wait for native Google sign-in and GIS callback before timing out. */
const GOOGLE_AUTH_TIMEOUT_MS = 60_000;

/** How long to wait for the system-browser OAuth flow (Huawei) to return. */
const BROWSER_AUTH_TIMEOUT_MS = 90_000;

/**
 * GMS-less builds (Huawei / AppGallery) cannot use the native Google SDK — it requires
 * Google Play Services. Those builds set `EXPO_PUBLIC_HAS_GMS=false` and fall back to a
 * system-browser OAuth flow instead. Every other build leaves the flag unset → has GMS.
 */
const HAS_GMS = process.env.EXPO_PUBLIC_HAS_GMS !== 'false';

/** Which Google sign-in mechanism a given platform/build should use. */
export type GoogleSignInStrategy = 'web-gis' | 'native-sdk' | 'web-oauth';

/**
 * Resolve the Google sign-in strategy for the current platform and build:
 * - `web-gis`    — browser: Google Identity Services (no GMS involved)
 * - `web-oauth`  — native GMS-less (Huawei): expo-auth-session system-browser OAuth
 * - `native-sdk` — native with GMS (Play / iOS): `@react-native-google-signin`
 *
 * Exported for unit testing — the hook itself can't be exercised headlessly.
 */
export function resolveGoogleSignInStrategy(
  platform: typeof Platform.OS,
  hasGms: boolean,
): GoogleSignInStrategy {
  if (platform === 'web') return 'web-gis';
  if (!hasGms) return 'web-oauth';
  return 'native-sdk';
}

/** Wraps a promise with a timeout that rejects after `ms` milliseconds. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

/** Dynamically load the Google Identity Services (GIS) SDK on web. */
function loadGisScript(): Promise<void> {
  if (Platform.OS !== 'web') return Promise.resolve();
  if (typeof document === 'undefined') return Promise.resolve();
  if (document.getElementById('google-gis-script')) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

// Required for expo-auth-session to complete the OAuth redirect on native (iOS).
WebBrowser.maybeCompleteAuthSession();

const authDatasource = new SupabaseAuthDatasource();

/**
 * Google OAuth sign-in hook for Expo.
 *
 * Platform strategy (see `resolveGoogleSignInStrategy`):
 * - iOS + Android with GMS: uses `@react-native-google-signin/google-signin` (native SDK).
 *   iOS reads from GoogleService-Info.plist; Android from google-services.json.
 *   No redirect URI is involved — avoids expo-auth-session redirect_uri_mismatch.
 * - Native without GMS (Huawei / AppGallery): the native SDK fails `hasPlayServices()`,
 *   so we use `expo-auth-session`'s system-browser OAuth flow to obtain a Google
 *   `id_token`, then exchange it via the same `signInWithGoogle` credential path.
 *   No backend changes — unlike Microsoft, Google's exchange is client-side.
 * - Web: uses Google Identity Services (GIS) SDK to obtain an ID token
 *   via a Google-managed popup, then exchanges it via `signInWithGoogle`
 *   (GoTrue `signInWithIdToken`). This avoids COOP and storage-partitioning
 *   issues associated with popup/redirect OAuth flows.
 *
 * Environment variables consumed:
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID      — required on all platforms
 *   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID  — the web-OAuth redirect + id_token audience
 *                                           key off this; Huawei builds must point it at
 *                                           an Android OAuth client registered for the
 *                                           Huawei package name + EAS keystore SHA-1.
 *   EXPO_PUBLIC_HAS_GMS=false             — selects the web-OAuth fallback (Huawei)
 *
 * @param onSuccess - Called after Firebase auth succeeds (e.g. for navigation).
 * @knipignore build-ahead: not yet consumed — wire up or remove.
 */
export function useGoogleSignIn(onSuccess?: () => void) {
  const finalizeAuthSession = useFinalizeAuthSession();
  const strategy = resolveGoogleSignInStrategy(Platform.OS, HAS_GMS);

  // ── Native (iOS + Android): @react-native-google-signin/google-signin ────
  // Uses the native SDK on both platforms — no redirect URI, no browser session.
  // On iOS this uses GoogleService-Info.plist; on Android it uses google-services.json.
  // This avoids expo-auth-session redirect_uri_mismatch issues on iOS dev clients.
  //
  // expo-auth-session hooks must still be called (Rules of Hooks) even though
  // the result is only used on the GMS-less native (Huawei) web-OAuth path. Config
  // must be valid per-platform to pass the library's internal validation.
  //
  // `invariantClientId` throws at render time when the platform's client ID is
  // undefined (e.g. the env var is missing from the build, or Google sign-in is
  // deferred and never configured). Because this hook is called unconditionally,
  // the throw crashes any screen that mounts it — including the Android dev client,
  // where `native-sdk` is the real strategy and this request's result is unused.
  // Every platform-specific client ID therefore falls back to a placeholder to keep
  // render safe; actual sign-in fails gracefully in the relevant mutation if the env
  // var is unset (and the whole flow is deferred in v1 regardless).
  //
  // No `redirectUri` override: the provider default `${applicationId}:/oauthredirect`
  // is the only redirect a Google Android OAuth client accepts for a browser flow.
  // The Huawei build registers that package-name scheme so the redirect routes back
  // (see app.config.js).
  //
  // `shouldAutoExchangeCode: false` — we exchange the authorization code for tokens
  // ourselves (see `completeWebOAuth` below). The provider's auto-exchange only runs when
  // it catches its own redirect via `WebBrowser.openAuthSessionAsync`, which is unreliable
  // for custom-scheme redirects in some environments (dev clients rewrite the scheme so the
  // return URL never matches). Owning the exchange lets us also drive it from a Linking
  // fallback, and avoids the code being double-spent.
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest(
    Platform.OS === 'ios'
      ? {
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? 'not-configured',
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? 'not-configured',
        }
      : {
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? 'not-configured',
          androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? 'not-configured',
          selectAccount: true,
          shouldAutoExchangeCode: false,
        },
  );

  const {
    mutate: signInWithNative,
    isPending: isNativePending,
    error: nativeError,
    reset: resetNative,
  } = useMutation({
    mutationFn: async () => {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      // On iOS, @react-native-google-signin v16 uses AppAuth. Providing both:
      //   iosClientId — tells AppAuth which iOS OAuth client to use for the flow
      //                 (correct custom scheme redirect; falls back to GoogleService-Info.plist)
      //   webClientId — requests a cross-client ID token with the web client as audience,
      //                 which is required by Firebase web SDK's signInWithCredential
      // Without iosClientId, AppAuth tries to auth as the web client → invalid_audience.
      // Without webClientId, the token audience is the iOS client → Firebase rejects it.
      if (Platform.OS === 'android') {
        GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
      } else {
        GoogleSignin.configure({
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        });
      }
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const signInPromise = GoogleSignin.signIn().then(({ data }) => {
        const idToken = data?.idToken;
        if (!idToken) throw new Error('Google Sign-In did not return an ID token');
        return authDatasource.signInWithGoogle(idToken);
      });

      const result = await withTimeout(
        signInPromise,
        GOOGLE_AUTH_TIMEOUT_MS,
        'Google sign-in timed out. Please try again.',
      );
      await finalizeAuthSession(result.user, result.idToken);
      return result;
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (err) => logAuthError('google', err, { flow: 'native-sdk' }),
  });

  // ── Web: Google Identity Services (GIS) + signInWithCredential ───────────
  // signInWithPopup and signInWithRedirect are both broken in modern browsers
  // due to COOP headers and storage partitioning. Instead, we use Google's
  // Identity Services SDK to get a JWT credential (ID token) via the
  // "Sign In with Google" flow, then pass it to signInWithCredential — the
  // same pattern used by Android and iOS.
  const gisCallbackRef = useRef<{
    resolve: (credential: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const {
    mutate: signInWithGisMutate,
    isPending: isWebPending,
    error: webError,
    reset: resetWeb,
  } = useMutation({
    mutationFn: async () => {
      await loadGisScript();
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      if (!clientId) throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set');

      const idToken = await withTimeout(
        new Promise<string>((resolve, reject) => {
          gisCallbackRef.current = { resolve, reject };

          // google.accounts.id returns a JWT credential (ID token) directly.
          // @ts-expect-error — google.accounts is loaded by the GIS script
          google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: { credential: string }) => {
              gisCallbackRef.current?.resolve(response.credential);
              gisCallbackRef.current = null;
            },
            cancel_on_tap_outside: false,
            auto_select: false,
            use_fedcm_for_prompt: true,
          });

          // Try One Tap first. If blocked/skipped, fall back to the full
          // Google sign-in popup via a hidden rendered button that we click.
          // @ts-expect-error — google.accounts is loaded by the GIS script
          google.accounts.id.prompt(
            (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              getDismissedReason: () => string;
            }) => {
              if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // One Tap unavailable — render a hidden Sign In button and click it.
                // This opens the full Google account picker popup.
                let container = document.getElementById('gis-signin-container');
                if (!container) {
                  container = document.createElement('div');
                  container.id = 'gis-signin-container';
                  container.style.position = 'fixed';
                  container.style.top = '-9999px';
                  container.style.left = '-9999px';
                  document.body.appendChild(container);
                }

                // @ts-expect-error — google.accounts is loaded by the GIS script
                google.accounts.id.renderButton(container, {
                  type: 'icon',
                  size: 'large',
                });

                // Click the rendered button to trigger the popup
                const btn = container.querySelector('[role="button"]') as HTMLElement | null;
                if (btn) {
                  btn.click();
                } else {
                  // Retry after a brief delay for rendering
                  setTimeout(() => {
                    const retryBtn = container?.querySelector(
                      '[role="button"]',
                    ) as HTMLElement | null;
                    if (retryBtn) {
                      retryBtn.click();
                    } else {
                      gisCallbackRef.current?.reject(
                        new Error('Google sign-in button could not be rendered'),
                      );
                      gisCallbackRef.current = null;
                    }
                  }, 200);
                }
              }
            },
          );
        }),
        GOOGLE_AUTH_TIMEOUT_MS,
        'Google sign-in timed out. Please try again.',
      );

      const result = await authDatasource.signInWithGoogle(idToken);
      await finalizeAuthSession(result.user, result.idToken);
      return result;
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (err) => {
      // Clear stale GIS callback ref so a late Google callback cannot resolve
      // an already-failed mutation.
      gisCallbackRef.current = null;
      logAuthError('google', err, { flow: 'web-gis' });
    },
  });

  // ── Native without GMS (Huawei): expo-auth-session system-browser OAuth ────
  // The native Google SDK needs Play Services, so on GMS-less devices we open the system
  // browser, get back an authorization code, exchange it for tokens ourselves (PKCE, no
  // client secret), then run the id_token through the same client-side `signInWithGoogle`
  // credential exchange used by every other platform — no backend involvement.
  const webOAuthTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledCodeRef = useRef<string | null>(null);
  const [isWebOAuthWaiting, setIsWebOAuthWaiting] = useState(false);
  const [webOAuthError, setWebOAuthError] = useState<Error | null>(null);

  const {
    mutate: completeWebOAuth,
    isPending: isWebOAuthExchanging,
    error: webOAuthExchangeError,
    reset: resetWebOAuth,
  } = useMutation({
    mutationFn: async (code: string) => {
      if (!googleRequest) throw new Error('Google auth request not ready.');
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: googleRequest.clientId,
          code,
          redirectUri: googleRequest.redirectUri,
          extraParams: { code_verifier: googleRequest.codeVerifier ?? '' },
        },
        Google.discovery,
      );
      const idToken = tokenResponse.idToken;
      if (!idToken) throw new Error('Google token exchange returned no id_token');
      const result = await authDatasource.signInWithGoogle(idToken);
      await finalizeAuthSession(result.user, result.idToken);
      return result;
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (err) => logAuthError('google', err, { flow: 'web-oauth' }),
  });

  // Complete the flow from an authorization code. Deduped so the two delivery paths below
  // (expo-auth-session's own result, and the Linking fallback) can't double-spend the
  // single-use code.
  const onAuthCode = useCallback(
    (code: string) => {
      if (handledCodeRef.current === code) return;
      handledCodeRef.current = code;
      setIsWebOAuthWaiting(false);
      if (webOAuthTimeoutRef.current) {
        clearTimeout(webOAuthTimeoutRef.current);
        webOAuthTimeoutRef.current = null;
      }
      completeWebOAuth(code);
    },
    [completeWebOAuth],
  );

  // Path 1 — expo-auth-session resolved its own redirect (works in standalone builds).
  // Only the GMS-less build drives this; other strategies never call `googlePromptAsync`.
  useEffect(() => {
    if (strategy !== 'web-oauth' || !googleResponse) return;
    if (googleResponse.type === 'success' && googleResponse.params.code) {
      onAuthCode(googleResponse.params.code);
    } else if (googleResponse.type !== 'success') {
      // 'cancel' / 'dismiss' / 'error' — stop the spinner.
      setIsWebOAuthWaiting(false);
      if (webOAuthTimeoutRef.current) {
        clearTimeout(webOAuthTimeoutRef.current);
        webOAuthTimeoutRef.current = null;
      }
    }
  }, [strategy, googleResponse, onAuthCode]);

  // Path 2 (fallback) — some environments (notably dev clients) rewrite the custom-scheme
  // redirect so expo-auth-session never matches its own return URL and it leaks to the
  // router. The redirect still reaches the app, so we catch it here directly, matching on
  // the `oauthredirect` path + `code` regardless of how the scheme was normalized.
  useEffect(() => {
    if (strategy !== 'web-oauth') return;
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (!/oauthredirect/i.test(url)) return;
      const code = Linking.parse(url).queryParams?.code;
      if (typeof code === 'string' && code) onAuthCode(code);
    });
    return () => sub.remove();
  }, [strategy, onAuthCode]);

  // Clean up the pending timeout on unmount.
  useEffect(() => {
    return () => {
      if (webOAuthTimeoutRef.current) clearTimeout(webOAuthTimeoutRef.current);
    };
  }, []);

  const signIn = useCallback(() => {
    switch (strategy) {
      case 'web-gis':
        resetWeb();
        signInWithGisMutate();
        return;
      case 'web-oauth':
        if (!googleRequest) {
          setWebOAuthError(new Error('Google login is unavailable right now. Please try again.'));
          return;
        }
        resetWebOAuth();
        handledCodeRef.current = null;
        setWebOAuthError(null);
        setIsWebOAuthWaiting(true);
        webOAuthTimeoutRef.current = setTimeout(() => {
          setIsWebOAuthWaiting(false);
          setWebOAuthError(new Error('Google sign-in timed out. Please try again.'));
        }, BROWSER_AUTH_TIMEOUT_MS);
        googlePromptAsync();
        return;
      default:
        resetNative();
        signInWithNative();
    }
  }, [
    strategy,
    signInWithGisMutate,
    signInWithNative,
    resetNative,
    resetWeb,
    resetWebOAuth,
    googleRequest,
    googlePromptAsync,
  ]);

  const isLoading =
    strategy === 'web-gis'
      ? isWebPending
      : strategy === 'web-oauth'
        ? isWebOAuthExchanging || isWebOAuthWaiting
        : isNativePending;

  // The web-OAuth request loads asynchronously; the button stays disabled until it's ready.
  const isReady = strategy === 'web-oauth' ? !!googleRequest : true;

  const error =
    strategy === 'web-gis'
      ? webError
      : strategy === 'web-oauth'
        ? (webOAuthError ?? webOAuthExchangeError)
        : nativeError;

  const cancel = useCallback(() => {
    switch (strategy) {
      case 'web-gis':
        resetWeb();
        return;
      case 'web-oauth':
        if (webOAuthTimeoutRef.current) clearTimeout(webOAuthTimeoutRef.current);
        setIsWebOAuthWaiting(false);
        resetWebOAuth();
        return;
      default:
        resetNative();
    }
  }, [strategy, resetNative, resetWeb, resetWebOAuth]);

  return { signIn, cancel, isLoading, isReady, error };
}
