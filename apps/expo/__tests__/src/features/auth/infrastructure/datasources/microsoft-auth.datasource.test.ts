import {
  MicrosoftAuthDatasource,
  microsoftAuthDatasource,
} from '@features/auth/infrastructure/datasources/microsoft-auth.datasource';
import { describe, expect, it } from 'vitest';

// The old Firebase flow exchanged a Microsoft id_token for a Firebase custom token
// via `signInWithCustomToken`. Self-hosted Supabase (GoTrue) has no custom-token
// sign-in, so the datasource is intentionally stubbed to throw until a
// GoTrue-compatible exchange is implemented. There is no Supabase equivalent for
// the previous exchange/mapping/error-propagation behaviour, so those Firebase-only
// cases are dropped; this suite pins the stub contract instead.
describe('MicrosoftAuthDatasource.exchangeToken (stubbed on Supabase)', () => {
  it('throws because Microsoft sign-in is not yet supported on Supabase', async () => {
    await expect(microsoftAuthDatasource.exchangeToken('ms-id-token')).rejects.toThrow(
      'Microsoft sign-in is not yet supported on Supabase',
    );
  });

  it('throws for any input regardless of token value', async () => {
    const datasource = new MicrosoftAuthDatasource();
    await expect(datasource.exchangeToken('')).rejects.toThrow(
      'Microsoft sign-in is not yet supported on Supabase',
    );
  });
});
