import { EmailIcon, LockIcon, PhoneIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import type { ReactNode } from 'react';
import { GoogleBrandIcon, MicrosoftBrandIcon } from '@/components/ui';
import { AuthenticationMethod } from '@/proxy/models';

/**
 * Returns the icon and i18n label for a given authentication method.
 * Single source of truth — used by the grid row and the user drawer.
 */
export function getAuthMethodPresentation(
  method: AuthenticationMethod,
  t: (key: string) => string,
): { icon: ReactNode; label: string } {
  switch (method) {
    case AuthenticationMethod.Google:
      return { icon: <GoogleBrandIcon />, label: t('users:authMethod.google') };
    case AuthenticationMethod.Microsoft365:
      return { icon: <MicrosoftBrandIcon />, label: t('users:authMethod.microsoft365') };
    case AuthenticationMethod.PhoneOtp:
      return {
        icon: <PhoneIcon size={iconSize.sm} className="text-text-muted" />,
        label: t('users:authMethod.phone'),
      };
    case AuthenticationMethod.CustomAuthentication:
      return {
        icon: <LockIcon size={iconSize.sm} className="text-text-muted" />,
        label: t('users:authMethod.customAuthentication'),
      };
    default:
      return {
        icon: <EmailIcon size={iconSize.sm} className="text-text-muted" />,
        label: t('users:authMethod.credentials'),
      };
  }
}
