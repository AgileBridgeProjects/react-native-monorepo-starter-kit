import { apiClient } from '@lib/http';
import { supabase } from '@lib/supabase/config';

/** Max time to wait for the revocation request before giving up. */
const REVOKE_TIMEOUT_MS = 5_000;

/**
 * Revokes server-side refresh tokens and signs out the local Supabase session
 * (clearing persisted storage). Both operations are best-effort — failures are
 * swallowed so that the caller can always proceed with redirect/logout.
 *
 * A 5-second AbortSignal prevents a stalled network request from blocking
 * the logout/redirect flow.
 */
export async function revokeAndSignOut(): Promise<void> {
  try {
    await apiClient.post('/api/auth/revoke-sessions', null, {
      signal: AbortSignal.timeout(REVOKE_TIMEOUT_MS),
    });
  } catch {
    // Token may already be expired or request timed out — continue.
  }
  try {
    await supabase.auth.signOut();
  } catch {
    // Best-effort.
  }
}
