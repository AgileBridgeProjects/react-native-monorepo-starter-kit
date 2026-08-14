import type { AuthUser } from '@starterkit/shared';
import { extractClubId } from '@starterkit/shared';
import { apiClient } from '@/src/lib/http/api-client';
import { supabase } from '@/src/lib/supabase/config';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Response shape from `POST /api/dev/bootstrap-phone`. */
interface BootstrapPhoneResponse {
  userId: string;
  clubId: string;
  message: string;
}

/** Result of a successful dev bootstrap. */
interface DevBootstrapResult {
  user: AuthUser;
  idToken: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Dev-only helper that bootstraps a phone user into the seeded StarterKit club.
 *
 * After Supabase OTP verification, phone users have no `club_id` claim.
 * In development, this calls the backend's `POST /api/dev/bootstrap-phone` endpoint
 * to create the user ↔ club link, then refreshes the Supabase session so
 * subsequent requests carry the `club_id` claim.
 *
 * Returns the hydrated `{ user, idToken }` pair ready for `setAuth()`.
 * Throws if the bootstrap request or token refresh fails.
 */
export async function devBootstrapPhone(
  user: AuthUser,
  idToken: string,
): Promise<DevBootstrapResult> {
  const bootstrapResponse = await apiClient.post<BootstrapPhoneResponse>(
    '/api/dev/bootstrap-phone',
    {},
    { headers: { Authorization: `Bearer ${idToken}` } },
  );

  // Refresh the Supabase session so the club_id claim is embedded.
  const refreshed = await refreshSupabaseToken();

  if (refreshed) {
    return {
      user: { ...user, clubId: refreshed.clubId },
      idToken: refreshed.token,
    };
  }

  // Fallback: use the clubId from the bootstrap response directly.
  return {
    user: { ...user, clubId: bootstrapResponse.data?.clubId },
    idToken,
  };
}

// ─── Internals ───────────────────────────────────────────────────────────────

interface RefreshedToken {
  clubId: string;
  token: string;
}

async function refreshSupabaseToken(): Promise<RefreshedToken | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) return null;

  const clubId = extractClubId(data.session);
  return clubId ? { clubId, token: data.session.access_token } : null;
}
