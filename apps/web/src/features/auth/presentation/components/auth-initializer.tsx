'use client';

import { supabase } from '@lib/supabase/config';
import { subscribeToAuth } from '@starterkit/shared';
import { useAuthStore } from '@store/auth-store';
import { useEffect } from 'react';

/**
 * Subscribes to Supabase `onAuthStateChange` and hydrates the web Zustand auth store.
 *
 * Mount once inside a Client Component subtree at the root layout level.
 * 1. Calls shared `subscribeToAuth()` which reads the `club_id` claim from
 *    `session.user.app_metadata` for multi-tenancy
 * 2. Updates `useAuthStore` with the user, idToken and hydration state
 *
 * Returns null — render-nothing component.
 */
export function AuthInitializer() {
  const { setAuth, logout, setHydrated } = useAuthStore();

  useEffect(() => {
    const unsubscribe = subscribeToAuth(supabase, {
      onAuthenticated: (user, idToken) => setAuth(user, idToken),
      onUnauthenticated: () => logout(),
      onSettled: () => setHydrated(true),
    });

    return unsubscribe;
  }, [setAuth, logout, setHydrated]);

  return null;
}
