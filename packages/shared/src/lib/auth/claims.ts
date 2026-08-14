/**
 * Multi-tenant claim extraction from a GoTrue user's `app_metadata`.
 *
 * `club_id` (and `club_subdomain`) are set server-side by the backend when
 * a user is linked to a club. They live in `app_metadata` — which only the
 * service role can write — NOT in `user_metadata`, which the user can edit. Both
 * apps read these during auth initialisation to establish tenant context.
 *
 * The claim may be ABSENT until the backend links the user; every extractor
 * returns `undefined` in that case and callers handle it gracefully.
 */

/** The GoTrue `app_metadata` bag, loosely typed — claim presence is not guaranteed. */
export type AppMetadata = Record<string, unknown> | null | undefined;

/**
 * Extracts the `club_id` claim from a GoTrue user's `app_metadata`.
 *
 * @returns The club ID string, or `undefined` if the claim is absent.
 */
export function extractClubIdFromMetadata(metadata: AppMetadata): string | undefined {
  const value = metadata?.club_id;
  return typeof value === 'string' ? value : undefined;
}

/**
 * Extracts the `club_subdomain` claim from a GoTrue user's `app_metadata`.
 *
 * Set alongside `club_id` when the backend provisions or links a user to a
 * club. Used by the web portal after OAuth sign-in to redirect the user to
 * their club subdomain if they authenticated from a different subdomain.
 *
 * @returns The club subdomain slug, or `undefined` if the claim is absent.
 */
export function extractClubSubdomainFromMetadata(metadata: AppMetadata): string | undefined {
  const value = metadata?.club_subdomain;
  return typeof value === 'string' ? value : undefined;
}

/** Minimal shape carrying a GoTrue user's `app_metadata`. */
export interface HasAppMetadata {
  user?: { app_metadata?: AppMetadata } | null;
}

/**
 * Convenience wrapper: extract `club_id` from a GoTrue `Session`
 * (or any object exposing `user.app_metadata`).
 */
export function extractClubId(session: HasAppMetadata | null | undefined): string | undefined {
  return extractClubIdFromMetadata(session?.user?.app_metadata);
}

/**
 * Convenience wrapper: extract `club_subdomain` from a GoTrue `Session`
 * (or any object exposing `user.app_metadata`).
 */
export function extractClubSubdomain(
  session: HasAppMetadata | null | undefined,
): string | undefined {
  return extractClubSubdomainFromMetadata(session?.user?.app_metadata);
}
