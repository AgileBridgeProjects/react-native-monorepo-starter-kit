import { createSupabaseClient } from '@starterkit/shared';

/**
 * Supabase (self-hosted GoTrue) client for the web admin portal.
 *
 * Reads the gateway URL and anon key from `NEXT_PUBLIC_SUPABASE_*` env vars,
 * falling back to the local dev stack defaults so local development works
 * without a `.env.local`. The anon key is a public JWT — safe to ship in the
 * client bundle.
 *
 * Set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` only when
 * targeting a non-dev Supabase project (e.g. staging or production).
 */
const LOCAL_SUPABASE_URL = 'http://localhost:8000';
// Local self-hosted demo anon key (not a secret — signed with the demo JWT secret).
const LOCAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || LOCAL_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || LOCAL_SUPABASE_ANON_KEY;

/**
 * Supabase client with browser-managed session persistence.
 *
 * `storage` is guarded for SSR: Next.js evaluates this module on the server
 * where `window` is undefined, so we hand supabase-js `undefined` there (it
 * then falls back to in-memory) and `window.localStorage` in the browser.
 * `detectSessionInUrl` is false — the admin portal does not rely on magic-link
 * hash parsing; OAuth redirects are handled explicitly.
 */
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  persistSession: true,
  autoRefreshToken: true,
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  detectSessionInUrl: false,
});
