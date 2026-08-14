import { ChangePasswordSection } from '@features/auth/presentation/components/change-password-section';
import { ApiError } from '@lib/http';
import { useTranslation } from '@lib/i18n';
import { MAX_AVATAR_SIZE_BYTES } from '@starterkit/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Button, GradientBackground, Typography } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { colors, iconSize } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { pickImage } from '@/src/lib/utils/pick-image';
import { useProfile, useUpdateProfile, useUploadAvatar } from '../hooks/use-profile';
import { EDIT_PROFILE_TEST_IDS } from '../profile.copy';

export function EditProfileScreen() {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const { data: profile, refetch } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  const [displayName, setDisplayName] = useState('');
  // Track whether we've seeded the field from the server yet
  const seeded = useRef(false);

  const avatarUrl = profile?.avatarUrl ?? undefined;
  const name = profile?.displayName ?? '';
  const hasProfileChanges = displayName.trim() !== (profile?.displayName ?? '');
  // Only username/password and email/password accounts can change their password in-app.
  const isPasswordUser =
    profile?.authMethod === 'CustomAuthentication' || profile?.authMethod === 'Credentials';

  // Seed from server data on first load only
  useEffect(() => {
    if (profile?.displayName && !seeded.current) {
      setDisplayName(profile.displayName);
      seeded.current = true;
    }
  }, [profile?.displayName]);

  // Ensure we have fresh data when the screen gains focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  async function pickAndUploadAvatar() {
    const picked = await pickImage({
      maxSizeBytes: MAX_AVATAR_SIZE_BYTES,
      fileName: 'avatar.jpg',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (picked.status === 'canceled' || picked.status === 'permissionDenied') return;
    if (picked.status === 'tooLarge') {
      Alert.alert(t('error'), t('avatarTooLarge'));
      return;
    }

    try {
      const { avatarBlobPath } = await uploadAvatar.mutateAsync(picked.file);
      await updateProfile.mutateAsync({ avatarBlobPath });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('avatarUploadFailed');
      Alert.alert(t('error'), message);
    }
  }

  async function removeAvatar() {
    try {
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

  const avatarOverlay = uploadAvatar.isPending ? (
    <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
      <ActivityIndicator color="white" />
    </View>
  ) : (
    <View className="absolute bottom-0 right-0 rounded-full bg-primary p-xs">
      <Icon name="photo.fill" size={iconSize.sm} color={colors[colorScheme].background} />
    </View>
  );

  async function handleSave() {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      Alert.alert(t('error'), t('nameTooShort'));
      return;
    }
    try {
      await updateProfile.mutateAsync({ displayName: trimmed });
      router.back();
    } catch (_err) {
      Alert.alert(t('error'), t('updateFailed'));
    }
  }

  return (
    <GradientBackground headerClearance="none">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        testID={EDIT_PROFILE_TEST_IDS.screen}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-lg px-lg py-lg w-full self-center md:max-w-reading"
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Profile section ─────────────────────────────────────────── */}
          <Typography variant="h4">{t('profileSection')}</Typography>

          {/* Avatar with "Change profile picture" label */}
          <Pressable
            onPress={handleAvatarPress}
            disabled={uploadAvatar.isPending}
            className="items-center gap-sm py-sm"
            testID={EDIT_PROFILE_TEST_IDS.avatarButton}
            accessibilityLabel={t('changeProfilePicture')}
            accessibilityRole="button"
          >
            <View className="relative">
              <Avatar name={name} uri={avatarUrl} size="xxl" textClassName="text-2xl" />
              {avatarOverlay}
            </View>
            <Typography variant="body" className="font-semibold text-primary">
              {t('changeProfilePicture')}
            </Typography>
          </Pressable>

          {/* Display name input */}
          <Input
            label={t('displayName')}
            variant="outlinedDark"
            size="auth"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            returnKeyType="done"
            textContentType="name"
            onSubmitEditing={handleSave}
            testID={EDIT_PROFILE_TEST_IDS.displayNameInput}
          />

          <Button
            variant="primary"
            size="auth"
            onPress={handleSave}
            loading={updateProfile.isPending}
            disabled={!hasProfileChanges}
            fullWidth
            textClassName="font-body-bold"
            testID={EDIT_PROFILE_TEST_IDS.saveButton}
          >
            {t('save')}
          </Button>

          {/* ── Password section (password-based accounts only) ──────────── */}
          {isPasswordUser && (
            <>
              <View className="border-t border-white/10" />
              <Typography variant="h4">{t('passwordSection')}</Typography>
              <ChangePasswordSection />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}
