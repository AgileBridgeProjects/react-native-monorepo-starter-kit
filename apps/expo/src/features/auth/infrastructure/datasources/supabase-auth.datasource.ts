import { supabase } from '@lib/supabase/config';
import { SupabaseAuthDatasource as SharedSupabaseAuthDatasource } from '@starterkit/shared';

/**
 * Expo Supabase auth datasource.
 *
 * Thin wrapper around the shared `SupabaseAuthDatasource` that injects the
 * Expo-specific `supabase` client (configured with AsyncStorage persistence).
 *
 * Unlike the old Firebase datasource, phone OTP is unified through GoTrue's SMS
 * flow — there is no native/web platform split and no reCAPTCHA, so no method
 * overrides are needed.
 */
export class SupabaseAuthDatasource extends SharedSupabaseAuthDatasource {
  constructor() {
    super(supabase);
  }
}
