import { devBootstrapPhone } from '@features/auth/presentation/hooks/use-dev-bootstrap-phone';
import type { AuthUser } from '@starterkit/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── api-client ────────────────────────────────────────────────────────────────
const apiPost = vi.fn();
vi.mock('@/src/lib/http/api-client', () => ({
  apiClient: { post: (...a: unknown[]) => apiPost(...a) },
}));

// ─── Supabase client ─────────────────────────────────────────────────────────────
// After OTP verification a phone user has no club_id claim. The bootstrap
// endpoint links the user to the seeded dev club, then the hook refreshes the
// Supabase session so the new club_id claim (in app_metadata) is embedded.
const refreshSession = vi.fn();
vi.mock('@/src/lib/supabase/config', () => ({
  supabase: {
    auth: {
      refreshSession: (...a: unknown[]) => refreshSession(...a),
    },
  },
}));

const user: AuthUser = { id: 'uid-1', email: 'a@b.c', name: 'Alice' };

/** Builds a GoTrue-shaped session whose user carries the given club_id claim. */
function makeSession(clubId: string | undefined, accessToken = 'refreshed-token') {
  return {
    access_token: accessToken,
    user: { app_metadata: clubId ? { club_id: clubId } : {} },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  apiPost.mockResolvedValue({ data: { userId: 'uid-1', clubId: 'fallback-co', message: 'ok' } });
  // Default: refresh yields no club claim so tests must opt into the claim path.
  refreshSession.mockResolvedValue({ data: { session: makeSession(undefined) }, error: null });
});

describe('devBootstrapPhone', () => {
  it('calls the bootstrap endpoint with the bearer token from the id token', async () => {
    await devBootstrapPhone(user, 'id-token-1');

    expect(apiPost).toHaveBeenCalledWith(
      '/api/dev/bootstrap-phone',
      {},
      { headers: { Authorization: 'Bearer id-token-1' } },
    );
  });

  it('returns the user with the refreshed club_id claim and refreshed access token', async () => {
    refreshSession.mockResolvedValue({
      data: { session: makeSession('co-99', 'refreshed-token') },
      error: null,
    });

    const result = await devBootstrapPhone(user, 'id-token-1');

    expect(refreshSession).toHaveBeenCalled();
    expect(result.user.clubId).toBe('co-99');
    expect(result.idToken).toBe('refreshed-token');
    // Original identity fields are preserved.
    expect(result.user.id).toBe('uid-1');
    expect(result.user.email).toBe('a@b.c');
  });

  it('falls back to the bootstrap-response clubId when the refreshed session lacks the claim', async () => {
    refreshSession.mockResolvedValue({
      data: { session: makeSession(undefined) },
      error: null,
    });

    const result = await devBootstrapPhone(user, 'id-token-1');

    expect(result.user.clubId).toBe('fallback-co');
    expect(result.idToken).toBe('id-token-1');
  });

  it('falls back to the bootstrap-response clubId when the session refresh errors', async () => {
    refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'refresh failed' },
    });

    const result = await devBootstrapPhone(user, 'id-token-1');

    expect(result.user.clubId).toBe('fallback-co');
    expect(result.idToken).toBe('id-token-1');
  });

  it('falls back to the bootstrap-response clubId when there is no session', async () => {
    refreshSession.mockResolvedValue({ data: { session: null }, error: null });

    const result = await devBootstrapPhone(user, 'id-token-1');

    expect(result.user.clubId).toBe('fallback-co');
    expect(result.idToken).toBe('id-token-1');
  });

  it('propagates an error when the bootstrap request fails', async () => {
    apiPost.mockRejectedValue(new Error('bootstrap failed'));

    await expect(devBootstrapPhone(user, 'id-token-1')).rejects.toThrow('bootstrap failed');
  });
});
