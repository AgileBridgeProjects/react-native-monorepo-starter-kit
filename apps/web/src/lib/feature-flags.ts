/**
 * Public feature flags, read from `NEXT_PUBLIC_*` env vars.
 *
 * Flags follow the same convention as the rest of the app: an absent or any
 * non-`'true'` value means OFF. Read these as functions (not module constants)
 * so tests can flip the env var per-case via `vi.stubEnv(...)`.
 */

/**
 * Social sign-in (Google / Apple / Microsoft). OFF by default: auth ships
 * email/password only until the matching GoTrue providers are enabled and
 * configured. Enabling this without them makes the buttons error on click.
 */
export const isSocialAuthEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_SOCIAL_AUTH_ENABLED === 'true';
