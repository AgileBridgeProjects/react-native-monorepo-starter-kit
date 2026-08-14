import { useMutation } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useCallback } from 'react';

import { logAuthError } from '@/src/lib/auth-error-logger';

import { SupabaseAuthDatasource } from '../../infrastructure/datasources/supabase-auth.datasource';
import { useFinalizeAuthSession } from './use-finalize-auth-session';

/** How long to wait for the native Apple sign-in sheet + credential exchange. */
const APPLE_AUTH_TIMEOUT_MS = 60_000;

/**
 * Apple's cancel error code. Raising the native sheet and dismissing it is a
 * normal user action, not an error — we swallow it silently.
 */
const APPLE_CANCELED_CODE = 'ERR_REQUEST_CANCELED';

/** Wraps a promise with a timeout that rejects after `ms` milliseconds. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function isUserCanceled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === APPLE_CANCELED_CODE
  );
}

const authDatasource = new SupabaseAuthDatasource();

/**
 * Native "Sign in with Apple" hook for Expo (iOS only).
 *
 * Flow:
 * 1. Generate a random raw nonce and SHA256-hash it. Apple receives the *hashed*
 *    nonce; GoTrue receives the *raw* nonce and hashes it again to verify the
 *    identity token's `nonce` claim — this binds the token to this request and
 *    prevents replay.
 * 2. `AppleAuthentication.signInAsync` returns an `identityToken` (OIDC JWT).
 * 3. Exchange it via `SupabaseAuthDatasource.signInWithApple` (GoTrue
 *    `signInWithIdToken`), then finalize the session exactly like Google.
 *
 * Availability: only offered on iOS where `isAvailableAsync()` is true. Callers
 * (login-screen) gate rendering on `Platform.OS === 'ios'`.
 *
 * @param onSuccess - Called after auth + org resolution succeeds (e.g. navigation).
 */
export function useAppleSignIn(onSuccess?: () => void) {
  const finalizeAuthSession = useFinalizeAuthSession();

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: async () => {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) throw new Error('Sign in with Apple is not available on this device.');

      // Raw nonce → passed to Supabase; its SHA256 hash → handed to Apple.
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const signInPromise = AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      }).then((credential) => {
        if (!credential.identityToken) {
          throw new Error('Apple Sign-In did not return an identity token');
        }
        return authDatasource.signInWithApple(credential.identityToken, rawNonce);
      });

      const result = await withTimeout(
        signInPromise,
        APPLE_AUTH_TIMEOUT_MS,
        'Apple sign-in timed out. Please try again.',
      );
      await finalizeAuthSession(result.user, result.idToken);
      return result;
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (err) => {
      // User dismissing the Apple sheet is a silent no-op, not a failure.
      if (isUserCanceled(err)) return;
      logAuthError('apple', err, { flow: 'native-sdk' });
    },
  });

  const signIn = useCallback(() => {
    reset();
    mutate();
  }, [mutate, reset]);

  // Suppress the cancel "error" so the UI never surfaces it.
  const surfacedError = error && !isUserCanceled(error) ? error : null;

  return { signIn, isLoading: isPending, error: surfacedError };
}
