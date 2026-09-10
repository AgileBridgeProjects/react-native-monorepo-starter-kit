import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { useLogout } from '@features/auth/presentation/hooks/use-auth';
import { useOrganisations } from '@features/auth/presentation/hooks/use-organisations';
import { DevToolsCard } from '@features/profile/presentation/components/dev-tools-card';
import { ApiError } from '@lib/http';
import { useTranslation } from '@lib/i18n';
import { accountDisplayIdentifier, iconSize, MAX_AVATAR_SIZE_BYTES } from '@starterkit/shared';
import { useAuthStore } from '@store/auth-store';
import * as ImagePicker from 'expo-image-picker';
import { type Href, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  InteractionManager,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Card, Icon, SettingsGroup, SettingsRow, Typography } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { ContentSheet } from '@/components/ui/content-sheet';
import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/src/lib/cn';
import { useBreakpoints } from '@/src/lib/hooks/use-breakpoints';
import { useIsOnline } from '@/src/lib/hooks/use-is-online';
import {
  clearCachedAvatarUrl,
  getCachedAvatarUrl,
  setCachedAvatarUrl,
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
} from '../hooks/use-profile';
import { PROFILE_TEST_IDS } from '../profile.copy';

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function ProfileScreen() {
  const { t } = useTranslation('profile');
  const { t: tTitles } = useTranslation('titles');
  const { user } = useAuthStore();
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const router = useRouter();
  const isOnline = useIsOnline();
  const { mutateAsync: logout, isPending: isLoggingOut } = useLogout();

  const { data: profile } = useProfile();
  const { data: orgs } = useOrganisations();
  const showOrgSwitcher = (orgs?.length ?? 0) > 1;

  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  // Local preview URI — set immediately after the user picks a photo so the
  // avatar updates visually without waiting for the upload + query refetch.
  const [localAvatarUri, setLocalAvatarUri] = useState<string | undefined>(undefined);
  // MMKV-persisted URL — survives cold starts while the profile query rehydrates.
  const [cachedAvatarUrl, setCachedAvatarUrlState] = useState<string | null>(() =>
    getCachedAvatarUrl(),
  );

  const name = profile?.displayName ?? user?.name ?? '';
  // Custom-auth users have a synthetic, non-routable email — show their username instead.
  const accountIdentifier = accountDisplayIdentifier(profile?.email ?? user?.email);
  // During upload: local preview wins (instant feedback).
  // After upload: profile.avatarUrl wins so stale localAvatarUri doesn't linger.
  const showLocalPreview = uploadAvatar.isPending || updateProfile.isPending;
  const avatarUrl = showLocalPreview
    ? (localAvatarUri ?? profile?.avatarUrl ?? cachedAvatarUrl ?? undefined)
    : (profile?.avatarUrl ?? localAvatarUri ?? cachedAvatarUrl ?? undefined);

  async function pickAndUploadAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      exif: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    // Client-side guard: reject anything still over 8 MB after picker compression
    if (asset.fileSize && asset.fileSize > MAX_AVATAR_SIZE_BYTES) {
      Alert.alert(t('error'), t('avatarTooLarge'));
      return;
    }

    // Show the picked image immediately while uploading.
    setLocalAvatarUri(asset.uri);

    // The picker re-encodes to JPEG when allowsEditing + quality are set, so always
    // declare image/jpeg. Relying on asset.mimeType sent HEIC/HEIF on some Android
    // devices, which the backend rejects (it only accepts JPEG/PNG/GIF/WebP).
    const file = {
      uri: asset.uri,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    };
    try {
      const { avatarBlobPath, avatarUrl: uploadedSasUrl } = await uploadAvatar.mutateAsync(file);
      // Web: blob: URIs get revoked after use — upgrade to the stable SAS URL.
      // Native: file:// URIs are stable; skip the swap to avoid a grey flash
      // while expo-image downloads the new SAS URL before the profile refetches.
      if (asset.uri.startsWith('blob:') || asset.uri.startsWith('data:')) {
        setLocalAvatarUri(uploadedSasUrl);
      }
      // Cache the SAS URL immediately so it survives a cold restart even before
      // the profile query refetches. Cache any non-empty URL (includes Azurite http://
      // in dev so the header updates reactively when invalidateQueries re-renders it).
      if (uploadedSasUrl) {
        setCachedAvatarUrl(uploadedSasUrl);
      }
      await updateProfile.mutateAsync({ avatarBlobPath });
      // Don't clear localAvatarUri here — profile.avatarUrl takes priority once
      // showLocalPreview is false, so localAvatarUri naturally becomes irrelevant.
    } catch (err) {
      // Revert the optimistic preview on failure.
      setLocalAvatarUri(undefined);
      const message = err instanceof ApiError ? err.message : t('avatarUploadFailed');
      Alert.alert(t('error'), message);
    }
  }

  async function removeAvatar() {
    try {
      setLocalAvatarUri(undefined);
      setCachedAvatarUrlState(null);
      clearCachedAvatarUrl();
      await updateProfile.mutateAsync({ removeAvatar: true });
    } catch (_err) {
      Alert.alert(t('error'), t('updateFailed'));
    }
  }

  function handleAvatarPress() {
    if (!avatarUrl) {
      pickAndUploadAvatar();
      return;
    }

    // On web, Alert.alert doesn't support multi-button dialogs — go straight to picker.
    if (Platform.OS === 'web') {
      pickAndUploadAvatar();
      return;
    }

    const options = [t('changePhoto'), t('removePhoto'), t('cancel')];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 2, destructiveButtonIndex: 1 },
        (index) => {
          if (index === 0) pickAndUploadAvatar();
          else if (index === 1) removeAvatar();
        },
      );
    } else {
      Alert.alert(t('photo'), undefined, [
        { text: t('changePhoto'), onPress: pickAndUploadAvatar },
        { text: t('removePhoto'), onPress: removeAvatar, style: 'destructive' },
        { text: t('cancel'), style: 'cancel' },
      ]);
    }
  }

  const { isTablet } = useBreakpoints();
  const isWeb = Platform.OS === 'web' && isTablet;

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // ignore logout errors — navigate away regardless
    }
    router.replace('/(auth)/login');
  }

  function handleSwitchOrg() {
    InteractionManager.runAfterInteractions(() => router.push('/select-org' as Href));
  }

  const menuItems: MenuItemProps[] = [
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
      icon: 'person.fill',
      label: t('editProfile'),
      onPress: () => router.push('/edit-profile'),
      disabled: !isOnline,
      testID: PROFILE_TEST_IDS.editProfileMenuItem,
    },
    {
      icon: 'gearshape.fill',
      label: t('settings'),
      onPress: () => router.push('/settings'),
      disabled: !isOnline,
      testID: PROFILE_TEST_IDS.settingsMenuItem,
    },
    {
      icon: 'questionmark.circle.fill',
      label: t('help'),
      onPress: () => router.push('/help'),
      testID: PROFILE_TEST_IDS.helpMenuItem,
    },
  ];

  // Spinner while signing out, the sign-out glyph otherwise. Both branches are meaningful, so
  // the choice lives here rather than inline in the JSX (docs/standards/frontend.md
  // § Conditional rendering).
  const logoutGlyph = isLoggingOut ? (
    <ActivityIndicator color={colors[colorScheme].error} />
  ) : (
    <Icon
      name="rectangle.portrait.and.arrow.right"
      size={iconSize.sm}
      color={colors[colorScheme].error}
    />
  );

  return (
    <ContentSheet>
      <Stack.Screen options={{ headerShown: !isWeb }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-2xl w-full self-center md:max-w-reading md:px-xl lg:px-2xl"
        contentInsetAdjustmentBehavior="automatic"
        testID={PROFILE_TEST_IDS.screen}
      >
        {isWeb && (
          <Typography variant="h1" className="px-md pt-md font-black text-text">
            {tTitles('profile')}
          </Typography>
        )}

        {/* User info card */}
        <Card
          className="mx-lg mt-lg flex-row items-center gap-md"
          testID={PROFILE_TEST_IDS.profileCard}
        >
          <Pressable
            onPress={handleAvatarPress}
            disabled={uploadAvatar.isPending}
            className="relative"
            testID={PROFILE_TEST_IDS.avatarButton}
          >
            <Avatar name={name} uri={avatarUrl} size="lg" textClassName="text-lg" />
            {uploadAvatar.isPending ? (
              <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
                <ActivityIndicator color="white" />
              </View>
            ) : (
              <View className="absolute bottom-0 right-0 rounded-full bg-primary p-xs">
                <Icon name="photo.fill" size={iconSize.xs} color={colors[colorScheme].background} />
              </View>
            )}
          </Pressable>
          <View className="shrink gap-xs">
            <Typography variant="h3" testID={PROFILE_TEST_IDS.displayName}>
              {name}
            </Typography>
            <Typography
              variant="body"
              className="text-text-secondary"
              testID={PROFILE_TEST_IDS.email}
            >
              {accountIdentifier}
            </Typography>
          </View>
        </Card>

        {/* Menu card — the shared iOS grouped list: single-line rows, hairline separators
            inset to the label, padding on the rows so the separators reach the card edge.
            Was a hand-rolled Pressable list with its own spacing and a circular icon well. */}
        <SettingsGroup className="mx-lg mt-lg" testID={PROFILE_TEST_IDS.menuCard}>
          {menuItems.map((item) => (
            <SettingsRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              onPress={item.onPress}
              disabled={item.disabled}
              testID={item.testID}
            />
          ))}
        </SettingsGroup>

        {/* Logout at bottom — hidden on web desktop (accessible via the nav sidebar).
            Text + icon in the error colour rather than a filled button: signing out is a
            destructive, rarely-wanted action and a full-width primary CTA gave it the same
            visual weight as the screen's main task. */}
        {!isWeb && (
          <View className="px-lg pb-lg pt-xl">
            <Pressable
              onPress={isOnline && !isLoggingOut ? handleLogout : undefined}
              disabled={!isOnline || isLoggingOut}
              accessibilityRole="button"
              accessibilityLabel={t('logout')}
              accessibilityState={{ disabled: !isOnline || isLoggingOut }}
              className={cn(
                'touch-target flex-row items-center justify-center gap-sm active:opacity-70',
                (!isOnline || isLoggingOut) && 'opacity-40',
              )}
              testID={PROFILE_TEST_IDS.logoutButton}
            >
              {logoutGlyph}
              <Typography variant="body" className="font-body-bold text-error">
                {t('logout')}
              </Typography>
            </Pressable>
          </View>
        )}

        {/* Dev-only tooling, deliberately LAST — below sign out, so it never competes with
            the real content. Renders nothing outside the dev client / dev build. */}
        <DevToolsCard className="mx-lg mb-lg" />
      </ScrollView>
    </ContentSheet>
  );
}
