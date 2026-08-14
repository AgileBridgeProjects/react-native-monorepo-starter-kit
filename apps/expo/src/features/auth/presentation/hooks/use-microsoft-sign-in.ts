import { microsoftAuthDatasource } from '@features/auth/infrastructure/datasources/microsoft-auth.datasource';
import {
  generatePKCE,
  generateState,
  MS_PKCE_STATE_KEY,
  MS_PKCE_VERIFIER_KEY,
} from '@features/auth/infrastructure/utils/microsoft-pkce';
import { useMutation } from '@tanstack/react-query';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { logAuthError } from '@/src/lib/auth-error-logger';

import { useFinalizeAuthSession } from './use-finalize-auth-session';

// Required for expo-auth-session to complete the OAuth redirect on native.
WebBrowser.maybeCompleteAuthSession();

const MS_CLIENT_ID = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID ?? '';
const MS_TENANT_ID = process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID ?? 'common';

/** How long to wait for the native auth browser to return before timing out. */
const NATIVE_AUTH_TIMEOUT_MS = 90_000;

/**
 * Microsoft sign-in hook for Expo.
 *
 * Platform strategy:
 * - Web: manual OAuth 2.0 PKCE redirect flow. Redirects the browser to
 *   Microsoft's authorize endpoint, receives the auth code back in the URL
 *   query string, exchanges it for an id_token, then exchanges that with the
 *   backend for a Firebase custom token with `club_id`.
 * - Native (iOS/Android): uses `expo-auth-session` PKCE flow to obtain a
 *   Microsoft id_token, then exchanges it for a Firebase custom token via the
 *   backend (`POST /api/auth/microsoft/exchange`) and signs in with
 *   `signInWithCustomToken`.
 *
 * Prerequisites:
 *   EXPO_PUBLIC_MICROSOFT_CLIENT_ID  — Azure AD app (client) ID
 *   EXPO_PUBLIC_MICROSOFT_TENANT_ID  — tenant ID (defaults to "common")
 *
 * @param onSuccess - Called after Firebase auth succeeds (e.g. navigate to main app).
 */
export function useMicrosoftSignIn(onSuccess?: () => void) {
  const finalizeAuthSession = useFinalizeAuthSession();
  const nativeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Native: expo-auth-session PKCE → backend token exchange ───────────────
  const discovery = AuthSession.useAutoDiscovery(
    `https://login.microsoftonline.com/${MS_TENANT_ID}/v2.0`,
  );

  const scheme = process.env.EXPO_PUBLIC_APP_SCHEME ?? 'starterkit-mobile';

  const redirectUri = AuthSession.makeRedirectUri({
    scheme,
    path: 'auth/microsoft',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: MS_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
    },
    discovery,
  );

  const {
    mutate: exchangeNativeCode,
    isPending: isNativePending,
    error: nativeError,
    reset: resetNative,
  } = useMutation({
    mutationFn: async (code: string) => {
      if (!discovery) throw new Error('Microsoft discovery endpoint not ready.');
      if (!request?.codeVerifier) throw new Error('Microsoft auth request not ready.');

      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: MS_CLIENT_ID,
          code,
          redirectUri,
          extraParams: { code_verifier: request.codeVerifier },
        },
        discovery,
      );

      if (!tokenResponse.idToken) throw new Error('No id_token returned from Microsoft.');

      const result = await microsoftAuthDatasource.exchangeToken(tokenResponse.idToken);
      await finalizeAuthSession(result.user, result.idToken);
      return result;
    },
    onSuccess: () => {
      if (nativeTimeoutRef.current) clearTimeout(nativeTimeoutRef.current);
      onSuccess?.();
    },
    onError: (err) => logAuthError('microsoft', err, { flow: 'native-pkce' }),
  });

  // Track whether the native flow is waiting for the browser to return.
  const [isNativeWaiting, setIsNativeWaiting] = useState(false);
  const [nativeTimeoutError, setNativeTimeoutError] = useState<Error | null>(null);
  const handledCodeRef = useRef<string | null>(null);

  // Complete the native flow from an authorization code. Deduped so the two delivery paths
  // below (expo-auth-session's own result, and the Linking fallback) can't double-spend the
  // single-use code.
  const onNativeCode = useCallback(
    (code: string) => {
      if (handledCodeRef.current === code) return;
      handledCodeRef.current = code;
      setIsNativeWaiting(false);
      if (nativeTimeoutRef.current) {
        clearTimeout(nativeTimeoutRef.current);
        nativeTimeoutRef.current = null;
      }
      exchangeNativeCode(code);
    },
    [exchangeNativeCode],
  );

  // Path 1 — expo-auth-session resolved its own redirect (works in standalone builds).
  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && response.params.code) {
      onNativeCode(response.params.code);
    } else if (response.type !== 'success') {
      // 'cancel' / 'dismiss' / 'error' — stop the spinner.
      setIsNativeWaiting(false);
      if (nativeTimeoutRef.current) {
        clearTimeout(nativeTimeoutRef.current);
        nativeTimeoutRef.current = null;
      }
    }
  }, [response, onNativeCode]);

  // Path 2 (fallback) — some environments (notably dev clients) rewrite the custom-scheme
  // redirect so expo-auth-session never matches its own return URL and it leaks to the
  // router. The redirect still reaches the app, so we catch it here directly, matching on
  // the `auth/microsoft` path + `code`. Deduped with Path 1 via `onNativeCode`.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (!/auth\/microsoft/i.test(url)) return;
      const code = Linking.parse(url).queryParams?.code;
      if (typeof code === 'string' && code) onNativeCode(code);
    });
    return () => sub.remove();
  }, [onNativeCode]);

  // Clean up timeout on unmount.
  useEffect(() => {
    return () => {
      if (nativeTimeoutRef.current) clearTimeout(nativeTimeoutRef.current);
    };
  }, []);

  // ── Web: manual PKCE redirect → /auth/microsoft route handles exchange ────
  const [isWebLoading, setIsWebLoading] = useState(false);
  const [webError, setWebError] = useState<Error | null>(null);

  const signIn = useCallback(async () => {
    if (Platform.OS === 'web') {
      setIsWebLoading(true);
      setWebError(null);
      try {
        const { codeVerifier, codeChallenge } = await generatePKCE();
        const state = generateState();
        sessionStorage.setItem(MS_PKCE_VERIFIER_KEY, codeVerifier);
        sessionStorage.setItem(MS_PKCE_STATE_KEY, state);

        const redirectUrl = `${window.location.origin}/auth/microsoft`;
        const authUrl = new URL(
          `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize`,
        );
        authUrl.searchParams.set('client_id', MS_CLIENT_ID);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('redirect_uri', redirectUrl);
        authUrl.searchParams.set('scope', 'openid profile email');
        authUrl.searchParams.set('response_mode', 'query');
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('prompt', 'select_account');

        window.location.href = authUrl.toString();
      } catch (err) {
        setIsWebLoading(false);
        const e = err instanceof Error ? err : new Error(String(err));
        logAuthError('microsoft', e, { flow: 'web-pkce' });
        setWebError(e);
      }
    } else {
      if (!discovery) {
        setNativeTimeoutError(
          new Error('Microsoft login is unavailable right now. Please try again.'),
        );
        return;
      }

      resetNative();
      handledCodeRef.current = null;
      setNativeTimeoutError(null);
      setIsNativeWaiting(true);

      // Start a timeout — if the browser doesn't return within the limit,
      // surface an error so the user isn't stuck.
      nativeTimeoutRef.current = setTimeout(() => {
        setIsNativeWaiting(false);
        setNativeTimeoutError(new Error('Sign-in timed out. Please try again.'));
      }, NATIVE_AUTH_TIMEOUT_MS);

      promptAsync();
    }
  }, [promptAsync, resetNative, discovery]);

  const isLoading = Platform.OS === 'web' ? isWebLoading : isNativePending || isNativeWaiting;
  const isReady = Platform.OS === 'web' ? true : !!request;
  const error = Platform.OS === 'web' ? webError : (nativeTimeoutError ?? nativeError);

  const cancel = useCallback(() => {
    if (nativeTimeoutRef.current) clearTimeout(nativeTimeoutRef.current);
    setIsNativeWaiting(false);
    resetNative();
  }, [resetNative]);

  return { signIn, cancel, isLoading, isReady, error };
}
