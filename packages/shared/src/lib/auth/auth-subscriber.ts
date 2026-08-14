import type { SupabaseClient } from '@supabase/supabase-js';

import { authTransitionGuard } from './auth-transition-guard';
import { toUser } from './supabase-auth.datasource';
import type { AuthUser } from './types';

export interface AuthSubscriberCallbacks {
  onAuthenticated: (user: AuthUser, idToken: string, clubId: string | undefined) => void;
  onUnauthenticated: () => void;
  onSettled: () => void;
}

/**
 * Subscribes to Supabase (GoTrue) auth state changes and resolves user identity.
 *
 * Wraps `supabase.auth.onAuthStateChange`, reads the `club_id` claim from
 * `session.user.app_metadata`, and calls the appropriate callback. Both apps
 * (`apps/expo` and `apps/web`) call this from their own `AuthInitializer`
 * component, passing their Zustand store actions as callbacks.
 *
 * supabase-js fires an initial event on subscribe (INITIAL_SESSION), so the
 * store hydrates from persisted storage without a manual bootstrap call.
 *
 * @param supabase - The app's Supabase client
 * @param callbacks - Lifecycle callbacks that update the app's auth store
 * @returns An unsubscribe function to clean up the listener on unmount
 */
export function subscribeToAuth(
  supabase: SupabaseClient,
  callbacks: AuthSubscriberCallbacks,
): () => void {
  const { onAuthenticated, onUnauthenticated, onSettled } = callbacks;

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    try {
      if (session?.user) {
        // An explicit sign-in call (login/social/OTP) already owns resolving this
        // exact session — see auth-transition-guard.ts. Without this check, this
        // listener would run a second, concurrent org-resolution pass for the
        // same sign-in and race the explicit caller's pass on the same store.
        if (authTransitionGuard.inProgress) return;
        const user = toUser(session.user);
        onAuthenticated(user, session.access_token, user.clubId);
      } else {
        onUnauthenticated();
      }
    } catch {
      onUnauthenticated();
    } finally {
      onSettled();
    }
  });

  return () => subscription.unsubscribe();
}
