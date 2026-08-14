import { EDIT_PROFILE_TEST_IDS } from '@features/profile/presentation/profile.copy';
import { EditProfileScreen } from '@features/profile/presentation/screens/edit-profile-screen';
import { ApiError } from '@lib/http';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeUserProfile } from '@/test/factories/profile.factory';
import {
  byTestId,
  fireChangeText,
  firePress,
  hostByTestId,
  inputByTestId,
  queryAllByTestId,
  renderTree,
  type TestNode,
  textChildren,
} from '@/test/utils/rtr';

vi.mock('@lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
vi.mock('@/constants/tokens', async () => (await import('@/test/mocks/shared')).tokensMock());
vi.mock('@/components/ui/icon', async () => (await import('@/test/mocks/shared')).iconMock());

// react-native mock lacks ActionSheetIOS + ActivityIndicator; extend locally.
vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('@/test/mocks/react-native')>(
    '@/test/mocks/react-native',
  );
  return {
    ...actual,
    ActionSheetIOS: { showActionSheetWithOptions: vi.fn() },
    ActivityIndicator: 'ActivityIndicator',
  };
});

const backMock = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ back: backMock, push: vi.fn(), replace: vi.fn() }),
  // Invoke the focus callback synchronously so refetch() is exercised.
  useFocusEffect: (cb: () => void) => cb(),
}));

vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: vi.fn(),
}));

const profileState = { data: makeUserProfile(), refetch: vi.fn() };
const updateProfile = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
const uploadAvatar = { mutateAsync: vi.fn(), isPending: false };
vi.mock('@features/profile/presentation/hooks/use-profile', () => ({
  useProfile: () => profileState,
  useUpdateProfile: () => updateProfile,
  useUploadAvatar: () => uploadAvatar,
}));

vi.mock('@features/auth/presentation/components/change-password-section', () => ({
  ChangePasswordSection: () => React.createElement('View', { testID: 'change-password-section' }),
}));

vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ name, uri }: Record<string, unknown>) =>
    React.createElement('View', {
      testID: 'avatar',
      accessibilityLabel: `avatar:${name}:${uri ?? 'none'}`,
    }),
}));
vi.mock('@/components/ui/input', async () => {
  const ReactModule = await import('react');
  const R = (ReactModule as { default?: typeof React }).default ?? ReactModule;
  return {
    Input: ({ value, onChangeText, testID }: Record<string, unknown>) =>
      R.createElement('TextInput', { testID, value, onChangeText }),
  };
});

const renderScreen = (): TestNode => renderTree(React.createElement(EditProfileScreen)).root;

let alertSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  Platform.OS = 'ios';
  profileState.data = makeUserProfile();
  profileState.refetch = vi.fn();
  updateProfile.mutateAsync = vi.fn().mockResolvedValue(undefined);
  updateProfile.isPending = false;
  uploadAvatar.mutateAsync = vi.fn().mockResolvedValue({ avatarBlobPath: 'p/new.jpg' });
  uploadAvatar.isPending = false;
  alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
  vi.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({
    granted: true,
  } as Awaited<ReturnType<typeof ImagePicker.requestMediaLibraryPermissionsAsync>>);
  vi.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///pick.jpg', fileSize: 1000 }],
  } as Awaited<ReturnType<typeof ImagePicker.launchImageLibraryAsync>>);
});

describe('EditProfileScreen — structural snapshots', () => {
  it('matches the password-user render', () => {
    expect(renderTree(React.createElement(EditProfileScreen)).toJSON()).toMatchSnapshot();
  });

  it('matches the non-password (SSO) render', () => {
    profileState.data = makeUserProfile({ authMethod: 'Microsoft365' });
    expect(renderTree(React.createElement(EditProfileScreen)).toJSON()).toMatchSnapshot();
  });
});

describe('EditProfileScreen — layout', () => {
  it('renders the avatar button, display-name input and save button', () => {
    const root = renderScreen();
    expect(byTestId(root, EDIT_PROFILE_TEST_IDS.screen)).toBeTruthy();
    expect(byTestId(root, EDIT_PROFILE_TEST_IDS.avatarButton)).toBeTruthy();
    expect(byTestId(root, EDIT_PROFILE_TEST_IDS.displayNameInput)).toBeTruthy();
    expect(byTestId(root, EDIT_PROFILE_TEST_IDS.saveButton)).toBeTruthy();
    expect(textChildren(root)).toContain('profileSection');
  });

  it('refetches the profile when the screen gains focus', () => {
    renderScreen();
    expect(profileState.refetch).toHaveBeenCalled();
  });

  it('seeds the display-name input from the server profile', () => {
    profileState.data = makeUserProfile({ displayName: 'Server Name' });
    const root = renderScreen();
    expect(inputByTestId(root, EDIT_PROFILE_TEST_IDS.displayNameInput).props.value).toBe(
      'Server Name',
    );
  });
});

describe('EditProfileScreen — save button enablement', () => {
  it('disables save when the name matches the server value (no changes)', () => {
    const root = renderScreen();
    expect(
      hostByTestId(root, EDIT_PROFILE_TEST_IDS.saveButton).props.accessibilityState.disabled,
    ).toBeTruthy();
  });

  it('enables save once the name is edited', async () => {
    const root = renderScreen();
    await fireChangeText(
      inputByTestId(root, EDIT_PROFILE_TEST_IDS.displayNameInput),
      'Changed Name',
    );
    expect(
      hostByTestId(root, EDIT_PROFILE_TEST_IDS.saveButton).props.accessibilityState.disabled,
    ).toBeFalsy();
  });
});

describe('EditProfileScreen — save (validation + submit)', () => {
  it('blocks save and alerts when the trimmed name is shorter than 2 characters', async () => {
    const root = renderScreen();
    await fireChangeText(inputByTestId(root, EDIT_PROFILE_TEST_IDS.displayNameInput), ' a ');
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.saveButton));
    expect(updateProfile.mutateAsync).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('error', 'nameTooShort');
  });

  it('submits the trimmed display name and navigates back on success', async () => {
    const root = renderScreen();
    await fireChangeText(
      inputByTestId(root, EDIT_PROFILE_TEST_IDS.displayNameInput),
      '  Jamie Lee  ',
    );
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.saveButton));
    expect(updateProfile.mutateAsync).toHaveBeenCalledWith({ displayName: 'Jamie Lee' });
    expect(backMock).toHaveBeenCalledTimes(1);
  });

  it('alerts with the update-failed message and does not navigate when save fails', async () => {
    updateProfile.mutateAsync = vi.fn().mockRejectedValue(new Error('boom'));
    const root = renderScreen();
    await fireChangeText(inputByTestId(root, EDIT_PROFILE_TEST_IDS.displayNameInput), 'New Name');
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.saveButton));
    expect(alertSpy).toHaveBeenCalledWith('error', 'updateFailed');
    expect(backMock).not.toHaveBeenCalled();
  });
});

describe('EditProfileScreen — avatar (no current avatar → pick)', () => {
  it('uploads then patches the profile with the new blob path', async () => {
    profileState.data = makeUserProfile({ avatarUrl: null });
    const root = renderScreen();
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.avatarButton));

    expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    expect(uploadAvatar.mutateAsync).toHaveBeenCalledWith({
      uri: 'file:///pick.jpg',
      name: 'avatar.jpg',
      type: 'image/jpeg',
    });
    expect(updateProfile.mutateAsync).toHaveBeenCalledWith({ avatarBlobPath: 'p/new.jpg' });
  });

  it('aborts when media-library permission is denied', async () => {
    profileState.data = makeUserProfile({ avatarUrl: null });
    vi.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({
      granted: false,
    } as Awaited<ReturnType<typeof ImagePicker.requestMediaLibraryPermissionsAsync>>);
    const root = renderScreen();
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.avatarButton));
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(uploadAvatar.mutateAsync).not.toHaveBeenCalled();
  });

  it('does nothing when the picker is canceled', async () => {
    profileState.data = makeUserProfile({ avatarUrl: null });
    vi.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: true,
      assets: null,
    } as unknown as Awaited<ReturnType<typeof ImagePicker.launchImageLibraryAsync>>);
    const root = renderScreen();
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.avatarButton));
    expect(uploadAvatar.mutateAsync).not.toHaveBeenCalled();
  });

  it('rejects an oversized image with an alert before uploading', async () => {
    profileState.data = makeUserProfile({ avatarUrl: null });
    vi.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///huge.jpg', fileSize: 999_999_999 }],
    } as unknown as Awaited<ReturnType<typeof ImagePicker.launchImageLibraryAsync>>);
    const root = renderScreen();
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.avatarButton));
    expect(alertSpy).toHaveBeenCalledWith('error', 'avatarTooLarge');
    expect(uploadAvatar.mutateAsync).not.toHaveBeenCalled();
  });

  it('surfaces the ApiError message when the upload fails', async () => {
    profileState.data = makeUserProfile({ avatarUrl: null });
    uploadAvatar.mutateAsync = vi.fn().mockRejectedValue(new ApiError(413, 'Too large'));
    const root = renderScreen();
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.avatarButton));
    expect(alertSpy).toHaveBeenCalledWith('error', 'Too large');
  });

  it('falls back to a generic message for a non-ApiError upload failure', async () => {
    profileState.data = makeUserProfile({ avatarUrl: null });
    uploadAvatar.mutateAsync = vi.fn().mockRejectedValue(new Error('weird'));
    const root = renderScreen();
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.avatarButton));
    expect(alertSpy).toHaveBeenCalledWith('error', 'avatarUploadFailed');
  });
});

describe('EditProfileScreen — avatar (existing avatar → action sheet)', () => {
  it('opens the iOS action sheet and picks a new photo on index 0', async () => {
    profileState.data = makeUserProfile({ avatarUrl: 'https://cdn/me.jpg' });
    Platform.OS = 'ios';
    const root = renderScreen();
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.avatarButton));

    expect(ActionSheetIOS.showActionSheetWithOptions).toHaveBeenCalledTimes(1);
    const callback = vi.mocked(ActionSheetIOS.showActionSheetWithOptions).mock.calls[0][1];
    await act(async () => {
      await callback(0);
    });
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
  });

  it('removes the avatar on iOS action-sheet index 1', async () => {
    profileState.data = makeUserProfile({ avatarUrl: 'https://cdn/me.jpg' });
    Platform.OS = 'ios';
    const root = renderScreen();
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.avatarButton));
    const callback = vi.mocked(ActionSheetIOS.showActionSheetWithOptions).mock.calls[0][1];
    await act(async () => {
      await callback(1);
    });
    expect(updateProfile.mutateAsync).toHaveBeenCalledWith({ removeAvatar: true });
  });

  it('opens an Android alert with change/remove/cancel options', async () => {
    profileState.data = makeUserProfile({ avatarUrl: 'https://cdn/me.jpg' });
    Platform.OS = 'android';
    const root = renderScreen();
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.avatarButton));
    expect(ActionSheetIOS.showActionSheetWithOptions).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('photo', undefined, expect.any(Array));
    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const remove = buttons.find((b) => b.text === 'removePhoto');
    await act(async () => {
      await remove?.onPress?.();
    });
    expect(updateProfile.mutateAsync).toHaveBeenCalledWith({ removeAvatar: true });
  });

  it('alerts when avatar removal fails', async () => {
    profileState.data = makeUserProfile({ avatarUrl: 'https://cdn/me.jpg' });
    Platform.OS = 'android';
    updateProfile.mutateAsync = vi.fn().mockRejectedValue(new Error('nope'));
    const root = renderScreen();
    await firePress(byTestId(root, EDIT_PROFILE_TEST_IDS.avatarButton));
    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const remove = buttons.find((b) => b.text === 'removePhoto');
    await act(async () => {
      await remove?.onPress?.();
    });
    expect(alertSpy).toHaveBeenLastCalledWith('error', 'updateFailed');
  });
});

describe('EditProfileScreen — password section branch', () => {
  it('renders the change-password section for CustomAuthentication accounts', () => {
    profileState.data = makeUserProfile({ authMethod: 'CustomAuthentication' });
    expect(byTestId(renderScreen(), 'change-password-section')).toBeTruthy();
  });

  it('renders the change-password section for Credentials accounts', () => {
    profileState.data = makeUserProfile({ authMethod: 'Credentials' });
    expect(byTestId(renderScreen(), 'change-password-section')).toBeTruthy();
  });

  it('hides the change-password section for SSO (Microsoft365) accounts', () => {
    profileState.data = makeUserProfile({ authMethod: 'Microsoft365' });
    expect(queryAllByTestId(renderScreen(), 'change-password-section')).toHaveLength(0);
  });

  it('hides the change-password section for phone-OTP accounts', () => {
    profileState.data = makeUserProfile({ authMethod: 'PhoneOtp' });
    expect(queryAllByTestId(renderScreen(), 'change-password-section')).toHaveLength(0);
  });
});

describe('EditProfileScreen — avatar busy state', () => {
  it('disables the avatar button while an upload is pending', () => {
    uploadAvatar.isPending = true;
    const root = renderScreen();
    expect(byTestId(root, EDIT_PROFILE_TEST_IDS.avatarButton).props.disabled).toBeTruthy();
  });
});
