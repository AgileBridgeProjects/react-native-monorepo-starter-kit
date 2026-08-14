import { mmkvStorage } from '@lib/storage/mmkv-storage';
import { useAppStore } from '@store/app-store';
import { beforeEach, describe, expect, it } from 'vitest';

describe('appStore', () => {
  beforeEach(() => {
    // Clear persisted state and reset store to defaults
    mmkvStorage.removeItem('app-store');
    useAppStore.setState({
      colorScheme: 'light',
      isOnboarded: false,
      soundsEnabled: true,
      sfxVolume: 0.8,
      ambientEnabled: true,
      ambientVolume: 0.5,
    });
  });

  it('starts with default values', () => {
    const state = useAppStore.getState();
    expect(state.colorScheme).toBe('light');
    expect(state.isOnboarded).toBeFalsy();
    expect(state.soundsEnabled).toBe(true);
    expect(state.sfxVolume).toBe(0.8);
    expect(state.ambientEnabled).toBe(true);
    expect(state.ambientVolume).toBe(0.5);
  });

  it('setColorScheme updates the color scheme', () => {
    useAppStore.getState().setColorScheme('dark');
    expect(useAppStore.getState().colorScheme).toBe('dark');
  });

  it('setColorScheme accepts light', () => {
    useAppStore.getState().setColorScheme('light');
    expect(useAppStore.getState().colorScheme).toBe('light');
  });

  it('setOnboarded updates onboarding status', () => {
    useAppStore.getState().setOnboarded(true);
    expect(useAppStore.getState().isOnboarded).toBeTruthy();
  });

  it('setOnboarded can reset to false', () => {
    useAppStore.getState().setOnboarded(true);
    useAppStore.getState().setOnboarded(false);
    expect(useAppStore.getState().isOnboarded).toBeFalsy();
  });

  it('persists state to MMKV storage', () => {
    useAppStore.getState().setColorScheme('dark');
    const persisted = mmkvStorage.getItem('app-store');
    expect(persisted).toBeTruthy();
    const parsed = JSON.parse(persisted as string);
    expect(parsed.state.colorScheme).toBe('dark');
  });

  // ─── Sound settings ─────────────────────────────────────────────────────

  it('setSoundsEnabled toggles sound on/off', () => {
    useAppStore.getState().setSoundsEnabled(false);
    expect(useAppStore.getState().soundsEnabled).toBe(false);

    useAppStore.getState().setSoundsEnabled(true);
    expect(useAppStore.getState().soundsEnabled).toBe(true);
  });

  it('setSfxVolume updates the volume level', () => {
    useAppStore.getState().setSfxVolume(0.5);
    expect(useAppStore.getState().sfxVolume).toBe(0.5);
  });

  it('setSfxVolume accepts boundary values', () => {
    useAppStore.getState().setSfxVolume(0);
    expect(useAppStore.getState().sfxVolume).toBe(0);

    useAppStore.getState().setSfxVolume(1);
    expect(useAppStore.getState().sfxVolume).toBe(1);
  });

  it('persists sound settings to MMKV storage', () => {
    useAppStore.getState().setSoundsEnabled(false);
    useAppStore.getState().setSfxVolume(0.4);
    const persisted = mmkvStorage.getItem('app-store');
    expect(persisted).toBeTruthy();
    const parsed = JSON.parse(persisted as string);
    expect(parsed.state.soundsEnabled).toBe(false);
    expect(parsed.state.sfxVolume).toBe(0.4);
  });

  it('setAmbientEnabled toggles ambient audio on/off', () => {
    useAppStore.getState().setAmbientEnabled(false);
    expect(useAppStore.getState().ambientEnabled).toBe(false);

    useAppStore.getState().setAmbientEnabled(true);
    expect(useAppStore.getState().ambientEnabled).toBe(true);
  });

  it('setAmbientVolume updates the volume level', () => {
    useAppStore.getState().setAmbientVolume(0.3);
    expect(useAppStore.getState().ambientVolume).toBe(0.3);
  });

  it('setAmbientVolume clamps to the 0–1 range', () => {
    useAppStore.getState().setAmbientVolume(-0.5);
    expect(useAppStore.getState().ambientVolume).toBe(0);

    useAppStore.getState().setAmbientVolume(1.5);
    expect(useAppStore.getState().ambientVolume).toBe(1);
  });

  it('persists ambient settings to MMKV storage', () => {
    useAppStore.getState().setAmbientEnabled(false);
    useAppStore.getState().setAmbientVolume(0.2);
    const persisted = mmkvStorage.getItem('app-store');
    expect(persisted).toBeTruthy();
    const parsed = JSON.parse(persisted as string);
    expect(parsed.state.ambientEnabled).toBe(false);
    expect(parsed.state.ambientVolume).toBe(0.2);
  });
});
