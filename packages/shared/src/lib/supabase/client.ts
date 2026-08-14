import type { SupabaseClientOptions } from '@supabase/supabase-js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client pointed at a self-hosted GoTrue instance (reached
 * via the Kong gateway).
 *
 * `packages/shared` stays free of platform-specific setup: each app calls this
 * with its own URL, anon key, and auth persistence options (browser
 * `localStorage` on web, `AsyncStorage` on Expo native). This mirrors how the
 * old Firebase code accepted an app-provided `Auth` instance.
 *
 * @param url - The Supabase/Kong gateway URL (e.g. `http://localhost:8000`).
 * @param anonKey - The Supabase anon (public) key — a JWT signed with the
 *   project's JWT secret. Not a secret; safe to ship in the client bundle.
 * @param authOptions - Platform-specific auth persistence configuration.
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  authOptions: SupabaseClientOptions<'public'>['auth'],
): SupabaseClient {
  return createClient(url, anonKey, {
    auth: authOptions,
  });
}
