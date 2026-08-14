/**
 * Auth-related constants shared across apps.
 */

/**
 * Synthetic email domain used for CustomAuthentication users.
 * Firebase doesn't support native usernames, so we derive a deterministic email:
 *   `{username}@customauth.starterkitapp.internal`
 * Both the backend (when provisioning the Firebase user) and the mobile app
 * (when signing in) use this constant so the mapping stays in sync.
 */
export const CUSTOM_AUTH_EMAIL_DOMAIN = '@customauth.starterkitapp.internal';

/**
 * Returns the username for a CustomAuthentication user's synthetic email
 * (`{username}@customauth.starterkitapp.internal`), or `null` for a real email address.
 * Username casing is preserved; only the domain is matched case-insensitively.
 */
export function customAuthUsername(email: string | null | undefined): string | null {
  if (!email) return null;
  if (!email.toLowerCase().endsWith(CUSTOM_AUTH_EMAIL_DOMAIN)) return null;
  return email.slice(0, email.length - CUSTOM_AUTH_EMAIL_DOMAIN.length);
}

/**
 * The identifier to show beneath a user's display name: the username for
 * CustomAuthentication users (whose email is a synthetic, non-routable address)
 * and the email address for everyone else. Returns `null` when neither exists.
 */
export function accountDisplayIdentifier(email: string | null | undefined): string | null {
  return customAuthUsername(email) ?? email ?? null;
}

/**
 * Lifetime of an account-setup token in hours.
 * Must match the backend default in AccountSetupOptions.TokenExpiryHours.
 */
export const SETUP_TOKEN_EXPIRY_HOURS = 24;
