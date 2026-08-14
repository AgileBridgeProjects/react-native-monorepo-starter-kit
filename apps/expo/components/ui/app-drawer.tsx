import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { useLogout } from '@features/auth/presentation/hooks/use-auth';
import { useOrganisations } from '@features/auth/presentation/hooks/use-organisations';
import { getCachedAvatarUrl, useProfile } from '@features/profile/presentation/hooks/use-profile';
import { useTranslation } from '@lib/i18n';
import { useAuthStore } from '@store/auth-store';
import { iconSize, palette } from '@starterkit/shared';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { InteractionManager, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/src/lib/cn';
import { useIsOnline } from '@/src/lib/hooks/use-is-online';

import { Avatar } from './avatar';
import { Icon } from './icon';
import { Typography } from './typography';

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
}

interface DrawerMenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  /** When true, item is greyed out and non-pressable (e.g. offline). */
  disabled?: boolean;
  testID?: string;
}

export function AppDrawer({ visible, onClose }: AppDrawerProps) {
  const { user } = useAuthStore();
  const { data: profile } = useProfile();
  const [cachedAvatarUrl] = useState(() => getCachedAvatarUrl());
  const router = useRouter();
  const { t } = useTranslation('profile');
  const { mutateAsync: logout } = useLogout();
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const isOnline = useIsOnline();
  const { data: orgs } = useOrganisations();
  const showOrgSwitcher = (orgs?.length ?? 0) > 1;

  const handleEditProfile = () => {
    onClose();
    // InteractionManager fires after the modal dismiss animation completes,
    // avoiding the navigation racing with the slide-down transition.
    InteractionManager.runAfterInteractions(() => router.push('/profile'));
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace('/(auth)/login');
  };

  const handleSwitchOrg = () => {
    onClose();
    InteractionManager.runAfterInteractions(() => router.push('/select-org' as Href));
  };

  const menuItems: DrawerMenuItem[] = [
    ...(showOrgSwitcher
      ? [
          {
            icon: 'arrow.left.arrow.right',
            label: t('switchOrganisation'),
            onPress: handleSwitchOrg,
            disabled: !isOnline,
            testID: AUTH_TEST_IDS.drawer.switchOrg,
          },
        ]
      : []),
    {
      icon: 'person',
      label: t('editProfile'),
      onPress: handleEditProfile,
      disabled: !isOnline,
    },
    {
      icon: 'gearshape',
      label: t('settings'),
      onPress: () => {
        onClose();
        InteractionManager.runAfterInteractions(() => router.push('/settings'));
      },
      disabled: !isOnline,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ backgroundColor: colors[colorScheme].background }}>
        <SafeAreaView className="flex-1" style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Close button */}
          <View className="flex-row items-center justify-between px-lg py-md">
            <Pressable
              onPress={onClose}
              className="min-h-11 min-w-11 items-center justify-center"
              accessibilityLabel="Close menu"
              accessibilityRole="button"
            >
              <Icon name="xmark" size={iconSize.md} color={colors[colorScheme].text} />
            </Pressable>
          </View>

          {/* User info header */}
          <View className="flex-row items-center gap-md px-lg pb-lg pt-sm">
            <Avatar
              name={profile?.displayName ?? user?.name ?? ''}
              uri={profile?.avatarUrl ?? cachedAvatarUrl ?? undefined}
              size="lg"
              textClassName="text-lg"
            />
            <View className="shrink gap-xs">
              <Typography variant="h3">{profile?.displayName ?? user?.name ?? ''}</Typography>
              <Typography variant="body" className="text-text-secondary">
                {profile?.email ?? user?.email ?? ''}
              </Typography>
            </View>
          </View>

          {/* Divider */}
          <View className="mx-lg h-px bg-border" />

          {/* Your account section */}
          <View className="gap-xs px-lg pt-lg">
            <Typography variant="label" className="pb-sm uppercase text-text-muted">
              {t('yourAccount')}
            </Typography>

            {menuItems.map((item) => (
              <Pressable
                key={item.label}
                onPress={item.disabled ? undefined : item.onPress}
                disabled={item.disabled}
                className={cn(
                  'flex-row items-center gap-lg rounded-xl py-md',
                  item.disabled && 'opacity-40',
                )}
                accessibilityRole="button"
                accessibilityState={{ disabled: item.disabled }}
                testID={item.testID}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-surface">
                  <Icon
                    name={item.icon}
                    size={iconSize.sm}
                    color={
                      item.destructive ? colors[colorScheme].warning : colors[colorScheme].text
                    }
                  />
                </View>
                <View className="flex-1">
                  <Typography
                    variant="body"
                    className={item.destructive ? 'text-error' : 'text-text'}
                  >
                    {item.label}
                  </Typography>
                </View>
                <Icon
                  name="chevron.right"
                  size={iconSize.xs}
                  color={colors[colorScheme].textMuted}
                />
              </Pressable>
            ))}
          </View>

          {/* Divider */}
          <View className="mx-lg mt-md h-px bg-border" />

          {/* Support section */}
          <View className="gap-xs px-lg pt-lg">
            <Typography variant="label" className="pb-sm uppercase text-text-muted">
              {t('support')}
            </Typography>

            <Pressable
              onPress={() => {
                onClose();
                InteractionManager.runAfterInteractions(() => router.push('/help'));
              }}
              className="flex-row items-center gap-lg rounded-xl py-md"
              accessibilityRole="button"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-surface">
                <Icon
                  name="questionmark.circle"
                  size={iconSize.sm}
                  color={colors[colorScheme].text}
                />
              </View>
              <View className="flex-1">
                <Typography variant="body">{t('help')}</Typography>
              </View>
              <Icon name="chevron.right" size={iconSize.xs} color={colors[colorScheme].textMuted} />
            </Pressable>
          </View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Logout at bottom */}
          <View className="px-lg pb-lg pt-md">
            <Pressable
              onPress={isOnline ? handleLogout : undefined}
              disabled={!isOnline}
              className="flex-row items-center justify-center gap-sm py-md"
              style={!isOnline ? { opacity: 0.4 } : undefined}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isOnline }}
            >
              <Icon
                name="rectangle.portrait.and.arrow.right"
                size={iconSize.sm}
                color={palette.status.error}
              />
              <Typography variant="body" className="font-semibold text-error">
                {t('logout')}
              </Typography>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
