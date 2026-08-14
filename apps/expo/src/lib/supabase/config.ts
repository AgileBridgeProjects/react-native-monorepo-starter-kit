// URL and base64 polyfills are required for supabase-js to work under React
// Native's Hermes runtime. Must be imported before anything from supabase-js.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabaseClient } from '@starterkit/shared';
import { Platform } from 'react-native';

import { resolveDevLanUrl } from '@/src/lib/dev-lan-host';

/**
 * Supabase client — points at the self-hosted GoTrue instance (via the Kong
 * gateway). Reads the URL and anon key from `EXPO_PUBLIC_SUPABASE_*` env vars,
 * falling back to the local self-hosted dev defaults.
 *
 * Persistence uses AsyncStorage so the session survives app restarts.
 * `autoRefreshToken` handles silent token refresh while the app is foregrounded
 * (see `AuthInitializer` for the AppState wiring that starts/stops it).
 * `detectSessionInUrl` is disabled — there is no URL-based OAuth callback on
 * native; sign-in flows hand us tokens directly.
 */
// `resolveDevLanUrl`: in a local dev bundle only, and only when this names a localhost/LAN IP,
// swap in the host Metro was actually reached on so a changed DHCP lease can't leave sign-in
// hanging against a dead address. No-op in every release build — see the helper's remarks.
const SUPABASE_URL = resolveDevLanUrl(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://localhost:8000',
);
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

// During web server-side rendering (expo-router static render) there is no window/
// localStorage, and AsyncStorage's web shim touches window at import — which crashes
// the render. Disable persistence in that context; native and the browser keep their
// AsyncStorage/localStorage-backed sessions as normal.
const isWebServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  storage: isWebServer ? undefined : AsyncStorage,
  persistSession: !isWebServer,
  autoRefreshToken: !isWebServer,
  detectSessionInUrl: false,
});
