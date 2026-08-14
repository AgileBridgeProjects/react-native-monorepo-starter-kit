import { useLogout } from '@features/auth/presentation/hooks/use-auth';
import { useTranslation } from '@lib/i18n';
import { cn, iconSize } from '@starterkit/shared';
import { Pressable, View } from 'react-native';

import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Button } from './button';
import { Icon } from './icon';
import { Typography } from './typography';

interface LogoutButtonProps {
  /**
   * `'nav'` — compact icon + label row, used inside sidebars and drawers.
   * `'default'` — full-width outline Button, used on the profile screen.
   */
  variant?: 'nav' | 'default';
  /** Called immediately after the logout press (e.g. close a drawer). */
  onDismiss?: () => void;
  /** Passed to the mutation's onSuccess (e.g. redirect after logout). */
  onSuccess?: () => void;
  testID?: string;
  /** When true, renders the nav variant with dark (on-primary) styling for the dark sidebar. */
  dark?: boolean;
}

export function LogoutButton({
  variant = 'default',
  onDismiss,
  onSuccess,
  testID,
  dark = false,
}: LogoutButtonProps) {
  const { t } = useTranslation('profile');
  const { mutateAsync: logout, isPending } = useLogout();
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;

  const handlePress = async () => {
    try {
      await logout();
      onSuccess?.();
    } finally {
      onDismiss?.();
    }
  };

  if (variant === 'nav') {
    return (
      <View className={cn('border-t p-sm', dark ? 'border-white/10' : 'border-border')}>
        <Pressable
          onPress={handlePress}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel={t('logoutButton')}
          testID={testID}
          className={cn(
            'flex flex-row items-center gap-sm rounded-md px-sm py-xs opacity-100 disabled:opacity-50',
            dark ? 'hover:bg-white/10' : 'hover:bg-border',
          )}
        >
          <Icon
            name="rectangle.portrait.and.arrow.right"
            size={iconSize.xs}
            color={dark ? `${colors[colorScheme].primaryForeground}99` : colors[colorScheme].icon}
            aria-hidden
          />
          <Typography
            variant="body-sm"
            className={cn('font-medium', dark ? 'text-white/60' : 'text-text-secondary')}
          >
            {t('logoutButton')}
          </Typography>
        </Pressable>
      </View>
    );
  }

  return (
    <Button variant="outline" onPress={handlePress} disabled={isPending} testID={testID}>
      {t('logoutButton')}
    </Button>
  );
}
