import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { ProviderConflictFailure } from '../../src/lib/auth/failures';
import { SupabaseAuthDatasource } from '../../src/lib/auth/supabase-auth.datasource';
import { SUPABASE_ERROR_IDENTITY_ALREADY_EXISTS } from '../../src/lib/auth/supabase-error-codes';

/** Build a mock SupabaseClient whose `signInWithIdToken` returns the given result. */
function makeClient(signInWithIdToken: ReturnType<typeof vi.fn>): SupabaseClient {
  return { auth: { signInWithIdToken } } as unknown as SupabaseClient;
}

const SESSION = { access_token: 'jwt-token' };
const USER = { id: 'user-1', email: 'a@example.com', user_metadata: {}, app_metadata: {} };

describe('SupabaseAuthDatasource.signInWithApple', () => {
  it('calls signInWithIdToken with provider apple and the RAW nonce', async () => {
    const signInWithIdToken = vi.fn().mockResolvedValue({
      data: { session: SESSION, user: USER },
      error: null,
    });
    const ds = new SupabaseAuthDatasource(makeClient(signInWithIdToken));

    const result = await ds.signInWithApple('identity-token', 'raw-nonce');

    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'identity-token',
      nonce: 'raw-nonce',
    });
    expect(result.idToken).toBe('jwt-token');
    expect(result.user.id).toBe('user-1');
  });

  it('works without a nonce (nonce is undefined)', async () => {
    const signInWithIdToken = vi.fn().mockResolvedValue({
      data: { session: SESSION, user: USER },
      error: null,
    });
    const ds = new SupabaseAuthDatasource(makeClient(signInWithIdToken));

    await ds.signInWithApple('identity-token');

    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'identity-token',
      nonce: undefined,
    });
  });

  it('maps an identity-already-exists error to ProviderConflictFailure', async () => {
    const signInWithIdToken = vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: Object.assign(new Error('identity already exists'), {
        name: 'AuthApiError',
        code: SUPABASE_ERROR_IDENTITY_ALREADY_EXISTS,
        status: 422,
      }),
    });
    const ds = new SupabaseAuthDatasource(makeClient(signInWithIdToken));

    await expect(ds.signInWithApple('identity-token', 'raw-nonce')).rejects.toBeInstanceOf(
      ProviderConflictFailure,
    );
  });
});
