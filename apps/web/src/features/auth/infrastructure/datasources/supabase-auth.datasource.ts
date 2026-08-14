import { supabase } from '@lib/supabase/config';
import { SupabaseAuthDatasource as SharedSupabaseAuthDatasource } from '@starterkit/shared';

/**
 * Web Supabase auth datasource.
 *
 * Thin wrapper around the shared `SupabaseAuthDatasource` that injects the
 * web-specific `supabase` client (browser `localStorage` persistence).
 */
export class SupabaseAuthDatasource extends SharedSupabaseAuthDatasource {
  constructor() {
    super(supabase);
  }
}

/**
 * Shared singleton for non-React consumers (axios interceptors, SignalR token
 * factories) that need access-token retrieval without instantiating their own
 * datasource. React hooks may still `new SupabaseAuthDatasource()` freely.
 */
export const webAuthDatasource = new SupabaseAuthDatasource();
