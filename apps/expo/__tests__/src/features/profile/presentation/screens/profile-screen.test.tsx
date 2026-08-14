import { PROFILE_MOCK_DATA, PROFILE_TEST_IDS } from '@features/profile/presentation/profile.copy';
import { ProfileScreen } from '@features/profile/presentation/screens/profile-screen';
import React from 'react';
import { Text, View } from 'react-native';
import { act, create } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flattenText } from '@/test/utils/flatten-text';

vi.mock('@features/auth/presentation/hooks/use-organisations', () => ({
  useOrganisations: () => ({ data: [] }),
}));

vi.mock('@/src/lib/hooks/use-is-online', () => ({
  useIsOnline: () => true,
}));

vi.mock('expo-image', () => ({
  Image: () => null,
}));

vi.mock('@features/auth/presentation/hooks/use-auth', () => ({
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@store/auth-store', () => ({
  useAuthStore: () => ({
    user: { name: 'Alex Johnson', email: 'alex.johnson@starterkit.app' },
  }),
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'profileHeading') return 'Profile';
      if (key === 'memberSince') return `Member since ${params?.date}`;
      if (key === 'editProfile') return 'Edit profile';
      if (key === 'name') return 'Name';
      if (key === 'email') return 'Email';
      return key;
    },
  }),
}));

vi.mock('@/components/ui', () => ({
  Icon: vi.fn(() => null),
  Typography: vi.fn(({ children }: { children: React.ReactNode }) =>
    React.createElement(Text, {}, children),
  ),
  GradientBackground: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, {}, children),
  Card: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement(View, { testID }, children),
  SettingsGroup: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement(View, { testID }, children),
  SettingsRow: ({
    label,
    onPress,
    disabled,
    testID,
  }: {
    label?: string;
    onPress?: () => void;
    disabled?: boolean;
    testID?: string;
  }) =>
    React.createElement(
      'Pressable',
      { onPress: disabled ? undefined : onPress, disabled, testID },
      React.createElement(Text, {}, label),
    ),
  Button: ({
    children,
    onPress,
    disabled,
    testID,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    testID?: string;
  }) =>
    React.createElement(
      'Pressable',
      { onPress: disabled ? undefined : onPress, disabled, testID },
      React.createElement(Text, {}, children),
    ),
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: () => React.createElement(View),
}));

vi.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: vi.fn(),

  requestMediaLibraryPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
}));

const profileMock = vi.hoisted(() => ({
  data: {
    id: 'test-user-id',
    displayName: 'Alex Johnson',
    email: 'alex.johnson@starterkit.app',
    avatarUrl: null,
    clubName: null,
    gamesPlayed: 0,
    gamesPassed: 0,
    joinedAt: '2024-01-14T00:00:00.000Z',
  },
}));

vi.mock('@features/profile/presentation/hooks/use-profile', () => ({
  useProfile: () => profileMock,
  useUpdateProfile: () => ({ mutate: vi.fn(), isPending: false }),
  useUploadAvatar: () => ({ mutate: vi.fn(), isPending: false }),
  getCachedAvatarUrl: () => null,
  setCachedAvatarUrl: vi.fn(),
  clearCachedAvatarUrl: vi.fn(),
}));

const routerPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn(), back: vi.fn() }),
  Stack: Object.assign(
    ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    { Screen: (_props: Record<string, unknown>) => null },
  ),
}));

describe('ProfileScreen', () => {
  it('renders the profile heading and profile summary details', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(React.createElement(ProfileScreen));
    });

    if (!renderer) {
      throw new Error('Expected profile screen renderer to be created.');
    }

    const text = flattenText(renderer.root);

    expect(text).toContain(PROFILE_MOCK_DATA.user.name);
    expect(text).toContain(PROFILE_MOCK_DATA.user.email);
  });

  it('renders the edit profile section', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(React.createElement(ProfileScreen));
    });

    if (!renderer) {
      throw new Error('Expected profile screen renderer to be created.');
    }

    const text = flattenText(renderer.root);

    expect(text).toContain('Edit profile');
  });
});
