import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authTransitionGuard } from '../../src/lib/auth/auth-transition-guard';
import { SupabaseAuthDatasource } from '../../src/lib/auth/supabase-auth.datasource';

/** Build a mock SupabaseClient whose `signInWithPassword` returns the given result. */
function makeClient(signInWithPassword: ReturnType<typeof vi.fn>): SupabaseClient {
  return { auth: { signInWithPassword } } as unknown as SupabaseClient;
}

const SESSION = { access_token: 'jwt-token' };
const USER = { id: 'user-1', email: 'a@example.com', user_metadata: {}, app_metadata: {} };

describe('authTransitionGuard around SupabaseAuthDatasource.login', () => {
  beforeEach(() => {
    authTransitionGuard.inProgress = false;
  });

  it('is set while login is in flight, so a concurrent SIGNED_IN listener can detect it', async () => {
    const signInWithPassword = vi.fn().mockImplementation(async () => {
      // The real supabase-js client fires onAuthStateChange synchronously from
      // within this call — assert the guard is already up by the time that happens.
      expect(authTransitionGuard.inProgress).toBe(true);
      return { data: { session: SESSION, user: USER }, error: null };
    });
    const ds = new SupabaseAuthDatasource(makeClient(signInWithPassword));

    await ds.login('a@example.com', 'password');
  });

  it('leaves the guard set after a successful login — the caller resets it once finalized', async () => {
    const signInWithPassword = vi
      .fn()
      .mockResolvedValue({ data: { session: SESSION, user: USER }, error: null });
    const ds = new SupabaseAuthDatasource(makeClient(signInWithPassword));

    await ds.login('a@example.com', 'password');

    expect(authTransitionGuard.inProgress).toBe(true);
  });

  it('clears the guard when login fails, so it never gets stuck for a later sign-in', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: Object.assign(new Error('invalid credentials'), {
        name: 'AuthApiError',
        status: 400,
      }),
    });
    const ds = new SupabaseAuthDatasource(makeClient(signInWithPassword));

    await expect(ds.login('a@example.com', 'wrong')).rejects.toThrow();
    expect(authTransitionGuard.inProgress).toBe(false);
  });
});
