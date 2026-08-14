import { useAppStore } from '@store/app-store';
import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

// ─── One-shot SFX ─────────────────────────────────────────────────────────────

const SFX_KEYS = ['correct-answer', 'drop-chip', 'earn-xp', 'session-complete', 'unlock'] as const;

export type SfxKey = (typeof SFX_KEYS)[number];

/**
 * Generic SFX hook that pre-loads all registered sounds and exposes a `play` function.
 * Respects the user's `soundsEnabled` toggle and `sfxVolume` level from settings.
 *
 * The `require('...wav')` calls live inside the hook body (not a module-level
 * registry) so that importing anything else from this module — `useAmbientAudio`
 * in particular — never forces Node to load these binary assets. Metro's static
 * asset transform still finds and bundles each call correctly wherever it appears.
 *
 * Usage:
 * ```ts
 * const { play } = useSfx();
 * play('correct-answer');
 * ```
 */
export function useSfx() {
  const correctPlayer = useAudioPlayer(require('../../../assets/audio/correct-answer.wav'));
  const dropChipPlayer = useAudioPlayer(require('../../../assets/audio/drop-chip.wav'));
  const earnXpPlayer = useAudioPlayer(require('../../../assets/audio/earn-xp.wav'));
  const sessionCompletePlayer = useAudioPlayer(
    require('../../../assets/audio/session-complete.wav'),
  );
  const unlockPlayer = useAudioPlayer(require('../../../assets/audio/unlock.wav'));

  const players = useMemo(
    () => ({
      'correct-answer': correctPlayer,
      'drop-chip': dropChipPlayer,
      'earn-xp': earnXpPlayer,
      'session-complete': sessionCompletePlayer,
      unlock: unlockPlayer,
    }),
    [correctPlayer, dropChipPlayer, earnXpPlayer, sessionCompletePlayer, unlockPlayer],
  );

  const play = useCallback(
    (key: SfxKey) => {
      // Web: gracefully no-op (expo-audio is native-only)
      if (Platform.OS === 'web') return;

      const { soundsEnabled, sfxVolume } = useAppStore.getState();
      if (!soundsEnabled) return;

      const player = players[key];
      if (!player) return;

      player.volume = sfxVolume;
      // seekTo(0) resets before replay so rapid re-triggers replay from the start
      // instead of layering onto an in-flight instance.
      player.seekTo(0);
      player.play();
    },
    [players],
  );

  return { play };
}

// ─── Ambient loops ─────────────────────────────────────────────────────────────

/**
 * audioKey → bundled ambient loop asset. Empty until ambient loops are authored —
 * see docs/standards/audio.md for the asset-onboarding convention. Dropping a file
 * into assets/audio/ and adding a registry entry here makes the corresponding key
 * live; unknown or absent keys no-op. Exported so tests can register a fake entry
 * without a real bundled asset.
 */
export const AMBIENT_ASSETS: Record<string, number> = {};

const CROSSFADE_MS = 800;
const CROSSFADE_STEP_MS = 50;
const CROSSFADE_STEPS = Math.round(CROSSFADE_MS / CROSSFADE_STEP_MS);

/** Ramps `player.volume` from `from` to `to` over `CROSSFADE_MS`, in-place. */
function fadeVolume(
  player: { volume: number },
  from: number,
  to: number,
  onComplete?: () => void,
): () => void {
  let step = 0;
  player.volume = from;
  const interval = setInterval(() => {
    step += 1;
    player.volume = Math.min(1, Math.max(0, from + ((to - from) * step) / CROSSFADE_STEPS));
    if (step >= CROSSFADE_STEPS) {
      clearInterval(interval);
      onComplete?.();
    }
  }, CROSSFADE_STEP_MS);
  return () => clearInterval(interval);
}

/**
 * Looping ambient audio paired with a `playing` flag (e.g. a Skill timer, AC 5.6).
 * Starts, stops, and crossfades between tracks as `audioKey` changes while
 * `playing` is true. Respects `ambientVolume`/`ambientEnabled` and the master
 * `soundsEnabled` mute, pauses automatically while the app is backgrounded and
 * resumes on foreground (if `playing` is still true), and no-ops on Web.
 *
 * Two fixed player slots ping-pong as the "active" and "incoming" track so a
 * key change can fade one out while fading the other in, instead of cutting.
 */
export function useAmbientAudio(audioKey: string | undefined, playing: boolean): void {
  const source = audioKey ? (AMBIENT_ASSETS[audioKey] ?? null) : null;

  // Pinned to the first-render instance: expo-audio already keeps a player stable
  // across re-renders for an unchanged source (`null` here, always), and pinning
  // via ref means the effect below never has to depend on the player identity.
  const playerARef = useRef(useAudioPlayer(null));
  const playerBRef = useRef(useAudioPlayer(null));
  const playerA = playerARef.current;
  const playerB = playerBRef.current;

  const activeSlotRef = useRef<'a' | 'b'>('a');
  const loadedSourceRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  // A crossfade runs two fades at once (outgoing fade-out + incoming fade-in); a single
  // ref can only ever cancel one of them, leaving the other to keep ticking and stomp on
  // a later direct volume set or reused player slot. Track every in-flight fade here so
  // any transition can cancel all of them before starting its own.
  const activeFadesRef = useRef<Array<() => void>>([]);
  // Stable via useCallback: this is a dependency of the effects below, and a fresh
  // closure every render would make them re-fire on every render regardless of
  // whether shouldPlay/source/targetVolume actually changed.
  const cancelActiveFades = useCallback(() => {
    for (const cancel of activeFadesRef.current) cancel();
    activeFadesRef.current = [];
  }, []);

  const ambientVolume = useAppStore((state) => state.ambientVolume);
  const ambientEnabled = useAppStore((state) => state.ambientEnabled);
  const soundsEnabled = useAppStore((state) => state.soundsEnabled);

  const [isForeground, setIsForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) =>
      setIsForeground(next === 'active'),
    );
    return () => subscription.remove();
  }, []);

  const targetVolume = soundsEnabled && ambientEnabled ? ambientVolume : 0;
  // A master mute (soundsEnabled=false) or the ambient-specific toggle silences
  // playback outright — unlike volume 0, which is a deliberate low level that
  // still plays (mirrors the SFX convention: volume never gates playback).
  const shouldPlay =
    Platform.OS !== 'web' &&
    playing &&
    isForeground &&
    source !== null &&
    soundsEnabled &&
    ambientEnabled;

  useEffect(() => {
    const active = activeSlotRef.current === 'a' ? playerA : playerB;
    const incoming = activeSlotRef.current === 'a' ? playerB : playerA;

    if (!shouldPlay) {
      if (isPlayingRef.current) {
        cancelActiveFades();
        isPlayingRef.current = false;
        // Both slots, not just `active`: a crossfade may still have `incoming` mid fade-in
        // when this fires (e.g. the app backgrounds mid-transition), and cancelling its fade
        // above leaves it stuck playing at whatever volume it had reached.
        activeFadesRef.current.push(fadeVolume(active, active.volume, 0, () => active.pause()));
        activeFadesRef.current.push(
          fadeVolume(incoming, incoming.volume, 0, () => incoming.pause()),
        );
      }
      return;
    }

    if (loadedSourceRef.current === source && isPlayingRef.current) {
      // Same track, already playing — live volume/mute changes apply immediately.
      // Cancel any fade still in flight (e.g. mid fade-in) so its next tick doesn't
      // overwrite this direct set with a stale target.
      cancelActiveFades();
      active.volume = targetVolume;
      // A crossfade's fade-out may still be in flight on `incoming` (activeSlotRef already
      // flipped when the crossfade started); cancelling it above skips its pause() onComplete,
      // so the old track would otherwise keep looping silently until unmount.
      incoming.pause();
      return;
    }

    cancelActiveFades();

    if (loadedSourceRef.current !== null && isPlayingRef.current) {
      // Switching tracks while already playing — crossfade instead of cutting.
      incoming.replace(source as number);
      incoming.loop = true;
      incoming.play();
      activeFadesRef.current.push(fadeVolume(incoming, 0, targetVolume));
      activeFadesRef.current.push(fadeVolume(active, active.volume, 0, () => active.pause()));
      activeSlotRef.current = activeSlotRef.current === 'a' ? 'b' : 'a';
    } else {
      // Fresh start, or resuming after a stop/background pause.
      active.replace(source as number);
      active.loop = true;
      active.play();
      activeFadesRef.current.push(fadeVolume(active, 0, targetVolume));
    }

    loadedSourceRef.current = source;
    isPlayingRef.current = true;
  }, [shouldPlay, source, targetVolume, playerA, playerB, cancelActiveFades]);

  // Unconditionally pause both slots on unmount — a fade may have already finished
  // (nothing left to cancel) while the track it started kept playing steadily, so
  // cancelling fades alone isn't enough to guarantee playback actually stops.
  //
  // `useAudioPlayer`'s own unmount cleanup (`useReleasingSharedObject` in
  // expo-modules-core) releases the native player in this same unmount pass, and it
  // was registered earlier in this hook than the effect below — so it can run first,
  // leaving `pause()` nothing to call and throwing NativeSharedObjectNotFoundException.
  // Releasing the player already stops native playback, so that failure mode is safe
  // to swallow per-player rather than let it abort the other slot's pause.
  useEffect(
    () => () => {
      cancelActiveFades();
      for (const player of [playerA, playerB]) {
        try {
          player.pause();
        } catch {
          // Already released by expo-audio's own unmount cleanup — nothing to pause.
        }
      }
    },
    [playerA, playerB, cancelActiveFades],
  );
}
