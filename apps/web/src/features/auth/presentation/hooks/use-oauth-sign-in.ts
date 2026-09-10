'use client';

import { supabase } from '@lib/supabase/config';
import { mapSupabaseError } from '@starterkit/shared';
import type { Provider } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';

type OAuthProviderType = 'google' | 'microsoft' | 'apple';

// Map our provider type to the GoTrue provider slug. Microsoft is exposed by
// GoTrue as the `azure` provider (Azure AD / Entra).
const PROVIDER_SLUG: Record<OAuthProviderType, Provider> = {
  google: 'google',
  microsoft: 'azure',
  apple: 'apple',
};

/**
 * Generic OAuth sign-in hook for the web admin portal.
 *
 * Uses Supabase (GoTrue) `signInWithOAuth`, which performs a full-page redirect
 * to the provider's consent screen and back to `redirectTo`. On return, the
 * shared `subscribeToAuth` subscription in `AuthInitializer` picks up the new
 * session and hydrates the auth store — this hook does not receive the session
 * synchronously the way the old Firebase popup flow did.
 *
 * The public interface (`{ signIn, isLoading, error }`) is unchanged so callers
 * need no updates.
 *
 * @param providerType - The OAuth provider to use ('google' | 'microsoft').
 * @param onSuccess - Retained for API compatibility. Not invoked in the redirect
 *   flow because navigation leaves the page before the promise settles.
 */
export function useOAuthSignIn(providerType: OAuthProviderType, _onSuccess?: () => void) {
  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: async () => {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: PROVIDER_SLUG[providerType],
        options: {
          redirectTo,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) throw mapSupabaseError(oauthError);
    },
  });

  return {
    signIn: () => {
      reset();
      mutate();
    },
    isLoading: isPending,
    error,
  };
}
