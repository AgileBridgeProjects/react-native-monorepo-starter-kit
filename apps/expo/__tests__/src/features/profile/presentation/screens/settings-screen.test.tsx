import { SETTINGS_TEST_IDS } from '@features/profile/presentation/profile.copy';
import { SettingsScreen } from '@features/profile/presentation/screens/settings-screen';
import * as Notifications from 'expo-notifications';
import React from 'react';
import { Alert, Linking } from 'react-native';
import { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byTestId, hostByTestId, queryByTestId, renderTree, type TestNode } from '@/test/utils/rtr';

vi.mock('@lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
vi.mock('@/constants/tokens', async () => (await import('@/test/mocks/shared')).tokensMock());

// react-native mock lacks Switch + Linking; extend it locally for this screen.
vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('@/test/mocks/react-native')>(
    '@/test/mocks/react-native',
  );
  const ReactModule = await import('react');
  const R = (ReactModule as { default?: typeof React }).default ?? ReactModule;
  return {
    ...actual,
    Switch: ({
      value,
      onValueChange,
      disabled,
      testID,
      accessibilityLabel,
    }: Record<string, unknown>) =>
      R.createElement('Switch', {
        testID,
        accessibilityLabel,
        accessibilityState: { checked: value, disabled },
        value,
        disabled,
        onValueChange,
      }),
    Linking: { openSettings: vi.fn() },
  };
});

vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
vi.mock('@/components/ui/content-sheet', () => ({
  ContentSheet: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('expo-notifications', () => ({
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
}));

const playSfx = vi.fn();
vi.mock('@lib/utils/sfx', () => ({
  useSfx: () => ({ play: playSfx }),
  useAmbientAudio: vi.fn(),
}));

// Controllable app-store snapshot.
const store = {
  notificationsEnabled: true,
  reduceMotion: false,
  soundsEnabled: true,
  sfxVolume: 0.8,
  ambientEnabled: true,
  ambientVolume: 0.5,
  setColorScheme: vi.fn(),
  setNotificationsEnabled: vi.fn(),
  setReduceMotion: vi.fn(),
  setSoundsEnabled: vi.fn(),
  setSfxVolume: vi.fn(),
  setAmbientEnabled: vi.fn(),
  setAmbientVolume: vi.fn(),
};
vi.mock('@store/app-store', () => ({
  useAppStore: () => store,
}));

const renderScreen = (): TestNode => renderTree(React.createElement(SettingsScreen)).root;

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(store, {
    notificationsEnabled: true,
    reduceMotion: false,
    soundsEnabled: true,
    sfxVolume: 0.8,
    ambientEnabled: true,
    ambientVolume: 0.5,
  });
  vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    status: 'granted',
  } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
  vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
    status: 'granted',
  } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);
});

describe('SettingsScreen — structural snapshot', () => {
  it('matches the default render (one group per setting)', () => {
    expect(renderTree(React.createElement(SettingsScreen)).toJSON()).toMatchSnapshot();
  });
});

describe('SettingsScreen — cards', () => {
  it('gives each general setting its own group, so its description can be a section footer', () => {
    // The three toggles used to share one card with a description crammed under each label.
    // iOS puts the explanation in the section FOOTER, below the card — which means one group
    // per setting, since a group has a single footer. Asserting the notifications switch is
    // alone in its group is what pins that structure.
    const root = renderScreen();
    const notificationsGroup = byTestId(root, SETTINGS_TEST_IDS.generalCard);
    expect(byTestId(notificationsGroup, SETTINGS_TEST_IDS.notificationsSwitch)).toBeTruthy();
    expect(queryByTestId(notificationsGroup, SETTINGS_TEST_IDS.darkModeSwitch)).toBeNull();
    expect(queryByTestId(notificationsGroup, SETTINGS_TEST_IDS.reduceMotionSwitch)).toBeNull();

    // All three remain on the screen, each in its own group.
    expect(byTestId(root, SETTINGS_TEST_IDS.darkModeSwitch)).toBeTruthy();
    expect(byTestId(root, SETTINGS_TEST_IDS.reduceMotionSwitch)).toBeTruthy();
  });
});

describe('SettingsScreen — rows', () => {
  it('reflects current store values on the switches', () => {
    store.reduceMotion = true;
    const root = renderScreen();
    expect(
      hostByTestId(root, SETTINGS_TEST_IDS.reduceMotionSwitch).props.accessibilityState.checked,
    ).toBeTruthy();
  });
});

describe('SettingsScreen — sound settings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reflects the current soundsEnabled/ambientEnabled switch state', () => {
    store.soundsEnabled = false;
    store.ambientEnabled = true;
    const root = renderScreen();

    expect(
      hostByTestId(root, SETTINGS_TEST_IDS.soundsSwitch).props.accessibilityState.checked,
    ).toBe(false);
    expect(
      hostByTestId(root, SETTINGS_TEST_IDS.ambientSwitch).props.accessibilityState.checked,
    ).toBe(true);
  });

  it('toggles soundsEnabled/ambientEnabled through the store, independently', () => {
    const root = renderScreen();

    act(() => {
      byTestId(root, SETTINGS_TEST_IDS.soundsSwitch).props.onValueChange(false);
    });
    expect(store.setSoundsEnabled).toHaveBeenCalledWith(false);
    expect(store.setAmbientEnabled).not.toHaveBeenCalled();

    act(() => {
      byTestId(root, SETTINGS_TEST_IDS.ambientSwitch).props.onValueChange(false);
    });
    expect(store.setAmbientEnabled).toHaveBeenCalledWith(false);
  });

  it('shows the volume slider only while its mute toggle is on', () => {
    store.soundsEnabled = false;
    store.ambientEnabled = false;
    const root = renderScreen();

    expect(queryByTestId(root, SETTINGS_TEST_IDS.soundsVolumeSlider)).toBeNull();
    expect(queryByTestId(root, SETTINGS_TEST_IDS.ambientVolumeSlider)).toBeNull();
  });

  it('debounces a slider drag before committing sfxVolume, then previews the sound', () => {
    const root = renderScreen();
    const slider = byTestId(root, SETTINGS_TEST_IDS.soundsVolumeSlider).find(
      (n) => n.type === 'Slider',
    );

    act(() => {
      slider.props.onValueChange(0.3);
    });
    expect(store.setSfxVolume).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(store.setSfxVolume).toHaveBeenCalledWith(0.3);
    expect(playSfx).toHaveBeenCalledWith('drop-chip');
  });

  it('debounces a slider drag before committing ambientVolume, without a preview sound', () => {
    const root = renderScreen();
    const slider = byTestId(root, SETTINGS_TEST_IDS.ambientVolumeSlider).find(
      (n) => n.type === 'Slider',
    );

    act(() => {
      slider.props.onValueChange(0.7);
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(store.setAmbientVolume).toHaveBeenCalledWith(0.7);
    expect(playSfx).not.toHaveBeenCalled();
  });

  it('only commits the latest value from a rapid drag, not every intermediate step', () => {
    const root = renderScreen();
    const slider = byTestId(root, SETTINGS_TEST_IDS.soundsVolumeSlider).find(
      (n) => n.type === 'Slider',
    );

    act(() => {
      slider.props.onValueChange(0.2);
      slider.props.onValueChange(0.4);
      slider.props.onValueChange(0.6);
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(store.setSfxVolume).toHaveBeenCalledOnce();
    expect(store.setSfxVolume).toHaveBeenCalledWith(0.6);
  });

  it('flushes a pending drag to the store on unmount instead of dropping it', () => {
    const renderer = renderTree(React.createElement(SettingsScreen));
    const slider = byTestId(renderer.root, SETTINGS_TEST_IDS.soundsVolumeSlider).find(
      (n) => n.type === 'Slider',
    );

    act(() => {
      slider.props.onValueChange(0.3);
    });
    expect(store.setSfxVolume).not.toHaveBeenCalled();

    // Unmount before the 50ms debounce fires — the drag must still land.
    act(() => {
      renderer.unmount();
    });

    expect(store.setSfxVolume).toHaveBeenCalledWith(0.3);
    expect(playSfx).not.toHaveBeenCalled(); // no preview sound on a flush
  });
});

describe('SettingsScreen — toggles', () => {
  it('renders the dark-mode switch locked on — StarterKit ships dark-mode only', () => {
    const root = renderScreen();
    const darkModeSwitch = byTestId(root, SETTINGS_TEST_IDS.darkModeSwitch);
    expect(darkModeSwitch.props.value).toBe(true);
    expect(darkModeSwitch.props.disabled).toBe(true);
    expect(darkModeSwitch.props.onValueChange).toBeUndefined();
  });

  it('toggles reduce-motion through the store', () => {
    const root = renderScreen();
    act(() => {
      byTestId(root, SETTINGS_TEST_IDS.reduceMotionSwitch).props.onValueChange(true);
    });
    expect(store.setReduceMotion).toHaveBeenCalledWith(true);
  });
});

describe('SettingsScreen — notifications permission flow', () => {
  it('forces notifications off when the OS reports permission not granted on mount', async () => {
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      status: 'denied',
    } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
    await act(async () => {
      renderTree(React.createElement(SettingsScreen));
    });
    expect(store.setNotificationsEnabled).toHaveBeenCalledWith(false);
  });

  it('does not force notifications off when the OS permission is granted', async () => {
    await act(async () => {
      renderTree(React.createElement(SettingsScreen));
    });
    expect(store.setNotificationsEnabled).not.toHaveBeenCalledWith(false);
  });

  it('turning notifications off skips the permission request', async () => {
    const root = renderScreen();
    await act(async () => {
      await byTestId(root, SETTINGS_TEST_IDS.notificationsSwitch).props.onValueChange(false);
    });
    expect(store.setNotificationsEnabled).toHaveBeenCalledWith(false);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('turning notifications on enables them when permission is granted', async () => {
    const root = renderScreen();
    await act(async () => {
      await byTestId(root, SETTINGS_TEST_IDS.notificationsSwitch).props.onValueChange(true);
    });
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(store.setNotificationsEnabled).toHaveBeenCalledWith(true);
  });

  it('turning notifications on shows a settings alert when permission is denied', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      status: 'denied',
    } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);
    const root = renderScreen();
    await act(async () => {
      await byTestId(root, SETTINGS_TEST_IDS.notificationsSwitch).props.onValueChange(true);
    });
    expect(store.setNotificationsEnabled).toHaveBeenCalledWith(false);
    expect(alertSpy).toHaveBeenCalledWith(
      'notificationsPermissionTitle',
      'notificationsPermissionMessage',
      expect.any(Array),
    );

    // Exercise the "Open settings" button callback.
    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const openSettings = buttons.find((b) => b.text === 'openSettings');
    openSettings?.onPress?.();
    expect(vi.mocked(Linking.openSettings)).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });
});
