import type { User } from '@features/users/domain/entities/user';
import { formatPascalCaseLabel } from '@lib/format-pascal-case-label';
import { CUSTOM_AUTH_EMAIL_DOMAIN } from '@starterkit/shared';
import { AuthenticationMethod } from '@/proxy/models';

/**
 * Formats a PascalCase role name into a space-separated display label.
 * @example formatRoleLabel('SuperAdmin') → 'Super Admin'
 */
export function formatRoleLabel(role: string | undefined): string {
  return formatPascalCaseLabel(role);
}

/**
 * Returns the localised auth method label for display in grids and details.
 */
export function formatAuthMethod(method: AuthenticationMethod, t: (key: string) => string): string {
  switch (method) {
    case AuthenticationMethod.Google:
      return t('users:authMethod.google');
    case AuthenticationMethod.Microsoft365:
      return t('users:authMethod.microsoft365');
    case AuthenticationMethod.PhoneOtp:
      return t('users:authMethod.phone');
    case AuthenticationMethod.CustomAuthentication:
      return t('users:authMethod.customAuthentication');
    default:
      return t('users:authMethod.credentials');
  }
}

/**
 * Returns the primary identifier for display based on the user's auth method.
 */
export function getIdentifier(user: User): string {
  if (user.authMethod === AuthenticationMethod.CustomAuthentication) return user.username ?? '-';
  if (user.authMethod === AuthenticationMethod.PhoneOtp) return user.phoneNumber ?? '-';
  return user.email ?? user.username ?? user.phoneNumber ?? '-';
}

/**
 * Match the logged-in user's email to a grid row, accounting for custom-auth email domain.
 */
export function isMatchingUser(authEmail: string | undefined, user: User): boolean {
  if (!authEmail) return false;
  const lower = authEmail.toLowerCase();
  if (user.email?.toLowerCase() === lower) return true;
  if (lower.endsWith(CUSTOM_AUTH_EMAIL_DOMAIN)) {
    const prefix = lower.slice(0, -CUSTOM_AUTH_EMAIL_DOMAIN.length);
    return user.email?.toLowerCase() === prefix || user.username?.toLowerCase() === prefix;
  }
  return false;
}
