import Slider from '@expo/ui/community/slider';
import { useTranslation } from '@lib/i18n';
import { useSfx } from '@lib/utils/sfx';
import { useAppStore } from '@store/app-store';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, Switch, View } from 'react-native';
import { SettingsGroup, SettingsRow } from '@/components/ui';
import { ContentSheet } from '@/components/ui/content-sheet';
import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SETTINGS_TEST_IDS } from '../profile.copy';

/** Debounce for slider drag → store commit, matching the community Slider's onValueChange-only API (no onSlidingComplete). */
const VOLUME_COMMIT_DEBOUNCE_MS = 50;

/** Matches the volume sliders' `step` prop, so VoiceOver increment/decrement moves the same amount as a drag step. */
const VOLUME_ACCESSIBILITY_STEP = 0.05;

/** Clamped increment/decrement step for a volume slider's `onAccessibilityAction` handler. */
function stepVolume(current: number, actionName: string): number {
  const delta = actionName === 'increment' ? VOLUME_ACCESSIBILITY_STEP : -VOLUME_ACCESSIBILITY_STEP;
  return Math.min(1, Math.max(0, current + delta));
}

/**
 * Buffers rapid slider drags in local state and commits to the store after a
 * short idle period, calling `onCommit` (e.g. a preview sound) once per commit.
 */
function useDebouncedVolumeSlider(
  volume: number,
  setVolume: (value: number) => void,
  onCommit?: (value: number) => void,
) {
  const [sliderValue, setSliderValue] = useState(volume);
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors the latest dragged value so an unmount mid-debounce can still flush it —
  // the cleanup below is a stable closure from mount, so it can't read `sliderValue`.
  const pendingValueRef = useRef<number | null>(null);

  // Re-sync if the volume changes externally (e.g. store rehydration).
  useEffect(() => {
    setSliderValue(volume);
  }, [volume]);

  useEffect(() => {
    return () => {
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
        // Flush rather than drop: the row can unmount mid-debounce (e.g. the mute
        // switch flips off right after a drag), which would otherwise silently lose
        // the last value the user dragged to. No preview sound on a flush — the
        // screen is going away, not being actively interacted with.
        if (pendingValueRef.current !== null) setVolume(pendingValueRef.current);
      }
    };
  }, [setVolume]);

  const handleValueChange = (value: number) => {
    setSliderValue(value);
    pendingValueRef.current = value;
    if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
    commitTimeoutRef.current = setTimeout(() => {
      pendingValueRef.current = null;
      setVolume(value);
      onCommit?.(value);
    }, VOLUME_COMMIT_DEBOUNCE_MS);
  };

  return { sliderValue, handleValueChange };
}

export function SettingsScreen() {
  const { t } = useTranslation('profile');
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    reduceMotion,
    setReduceMotion,
    soundsEnabled,
    setSoundsEnabled,
    sfxVolume,
    setSfxVolume,
    ambientEnabled,
    setAmbientEnabled,
    ambientVolume,
    setAmbientVolume,
  } = useAppStore();
  const { play: playSfx } = useSfx();
  const sfxSlider = useDebouncedVolumeSlider(sfxVolume, setSfxVolume, () => playSfx('drop-chip'));
  const ambientSlider = useDebouncedVolumeSlider(ambientVolume, setAmbientVolume);
  const webSwitchProps =
    Platform.OS === 'web'
      ? ({
          activeTrackColor: colors[colorScheme].primary,
          activeThumbColor: colors[colorScheme].primaryForeground,
        } as unknown as Record<string, unknown>)
      : undefined;

  // Sync toggle with real OS permission state on mount.
  // Only corrects downward: if the OS has revoked permission, force the store
  // to false. Never force-enables — the user may have deliberately turned it off.
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        setNotificationsEnabled(false);
      }
    })();
  }, [setNotificationsEnabled]);

  const handleNotificationsToggle = async (value: boolean) => {
    if (!value) {
      setNotificationsEnabled(false);
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(false);
      Alert.alert(t('notificationsPermissionTitle'), t('notificationsPermissionMessage'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('openSettings'), onPress: () => Linking.openSettings() },
      ]);
    }
  };

  return (
    <ContentSheet>
      <ScrollView
        testID={SETTINGS_TEST_IDS.screen}
        className="flex-1"
        contentContainerClassName="flex-grow gap-lg px-lg py-lg w-full self-center md:max-w-reading"
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* iOS grouped-list structure: one section per setting, its explanation in the
            section FOOTER below the card rather than crammed under the label. */}
        <SettingsGroup footer={t('notificationsDesc')} testID={SETTINGS_TEST_IDS.generalCard}>
          <SettingsRow icon="bell.fill" label={t('notifications')}>
            <Switch
              testID={SETTINGS_TEST_IDS.notificationsSwitch}
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              accessibilityLabel={t('notifications')}
              trackColor={{ false: colors[colorScheme].border, true: colors[colorScheme].primary }}
              thumbColor={colors[colorScheme].primaryForeground}
              {...webSwitchProps}
            />
          </SettingsRow>
        </SettingsGroup>

        {/* Dark mode — locked on: StarterKit ships dark-mode only (see use-color-scheme.ts),
            so there's nothing left to toggle. Kept visible rather than removed. */}
        <SettingsGroup footer={t('darkModeDesc')}>
          <SettingsRow icon="moon.fill" label={t('darkMode')} disabled>
            <Switch
              testID={SETTINGS_TEST_IDS.darkModeSwitch}
              value={true}
              disabled
              accessibilityLabel={t('darkMode')}
              trackColor={{ false: colors[colorScheme].border, true: colors[colorScheme].primary }}
              thumbColor={colors[colorScheme].primaryForeground}
              {...webSwitchProps}
            />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup footer={t('reduceMotionDesc')}>
          <SettingsRow icon="livephoto.slash" label={t('reduceMotion')}>
            <Switch
              testID={SETTINGS_TEST_IDS.reduceMotionSwitch}
              value={reduceMotion}
              onValueChange={setReduceMotion}
              accessibilityLabel={t('reduceMotion')}
              trackColor={{ false: colors[colorScheme].border, true: colors[colorScheme].primary }}
              thumbColor={colors[colorScheme].primaryForeground}
              {...webSwitchProps}
            />
          </SettingsRow>
        </SettingsGroup>

        {/* Sound effects — the slider row only appears while enabled, matching the
            reduce-motion/dark-mode single-purpose-per-group pattern above. */}
        <SettingsGroup footer={t('soundsDesc')}>
          <SettingsRow icon="speaker.fill" label={t('sounds')}>
            <Switch
              testID={SETTINGS_TEST_IDS.soundsSwitch}
              value={soundsEnabled}
              onValueChange={setSoundsEnabled}
              accessibilityLabel={t('sounds')}
              trackColor={{ false: colors[colorScheme].border, true: colors[colorScheme].primary }}
              thumbColor={colors[colorScheme].primaryForeground}
              {...webSwitchProps}
            />
          </SettingsRow>
          {soundsEnabled && (
            <SettingsRow icon="speaker.wave.2.fill" label={t('sfxVolume')}>
              <View
                className="w-32"
                testID={SETTINGS_TEST_IDS.soundsVolumeSlider}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel={t('sfxVolume')}
                accessibilityValue={{ min: 0, max: 1, now: sfxSlider.sliderValue }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(event) =>
                  sfxSlider.handleValueChange(
                    stepVolume(sfxSlider.sliderValue, event.nativeEvent.actionName),
                  )
                }
              >
                <Slider
                  minimumValue={0}
                  maximumValue={1}
                  step={VOLUME_ACCESSIBILITY_STEP}
                  value={sfxSlider.sliderValue}
                  onValueChange={sfxSlider.handleValueChange}
                  minimumTrackTintColor={colors[colorScheme].primary}
                  maximumTrackTintColor={colors[colorScheme].border}
                  thumbTintColor={colors[colorScheme].primary}
                />
              </View>
            </SettingsRow>
          )}
        </SettingsGroup>

        {/* Ambient sounds — independent volume/mute from SFX. */}
        <SettingsGroup footer={t('ambientSoundsDesc')}>
          <SettingsRow icon="waveform" label={t('ambientSounds')}>
            <Switch
              testID={SETTINGS_TEST_IDS.ambientSwitch}
              value={ambientEnabled}
              onValueChange={setAmbientEnabled}
              accessibilityLabel={t('ambientSounds')}
              trackColor={{ false: colors[colorScheme].border, true: colors[colorScheme].primary }}
              thumbColor={colors[colorScheme].primaryForeground}
              {...webSwitchProps}
            />
          </SettingsRow>
          {ambientEnabled && (
            <SettingsRow icon="speaker.wave.2.fill" label={t('ambientVolume')}>
              <View
                className="w-32"
                testID={SETTINGS_TEST_IDS.ambientVolumeSlider}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel={t('ambientVolume')}
                accessibilityValue={{ min: 0, max: 1, now: ambientSlider.sliderValue }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(event) =>
                  ambientSlider.handleValueChange(
                    stepVolume(ambientSlider.sliderValue, event.nativeEvent.actionName),
                  )
                }
              >
                <Slider
                  minimumValue={0}
                  maximumValue={1}
                  step={VOLUME_ACCESSIBILITY_STEP}
                  value={ambientSlider.sliderValue}
                  onValueChange={ambientSlider.handleValueChange}
                  minimumTrackTintColor={colors[colorScheme].primary}
                  maximumTrackTintColor={colors[colorScheme].border}
                  thumbTintColor={colors[colorScheme].primary}
                />
              </View>
            </SettingsRow>
          )}
        </SettingsGroup>
      </ScrollView>
    </ContentSheet>
  );
}
