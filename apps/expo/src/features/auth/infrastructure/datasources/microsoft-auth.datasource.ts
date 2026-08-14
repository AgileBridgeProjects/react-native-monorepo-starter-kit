import type { AuthUser } from '@starterkit/shared';

/**
 * Microsoft sign-in datasource.
 *
 * DEFERRED: The old flow exchanged a Microsoft id_token for a Firebase custom
 * token (`signInWithCustomToken`). Self-hosted Supabase (GoTrue) has no
 * custom-token sign-in, so this is not yet supported. Kept as a stub so the
 * Microsoft sign-in hook still compiles; `exchangeToken` throws until a
 * GoTrue-compatible exchange (e.g. an Azure OIDC provider or a server-issued
 * session) is implemented.
 */
export class MicrosoftAuthDatasource {
  async exchangeToken(_idToken: string): Promise<{ user: AuthUser; idToken: string }> {
    throw new Error('Microsoft sign-in is not yet supported on Supabase');
  }
}

export const microsoftAuthDatasource = new MicrosoftAuthDatasource();
