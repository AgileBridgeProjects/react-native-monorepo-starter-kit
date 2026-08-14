import { AMBIENT_ASSETS, useAmbientAudio } from '@lib/utils/sfx';
import { useAppStore } from '@store/app-store';
import { Platform } from 'react-native';
import { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook as baseRenderHook } from '@/test/utils/render-hook';

// Auto-unmounts every hook rendered through this wrapper at the end of the test.
// A still-mounted useAmbientAudio instance stays subscribed to the app store, so a
// later test's beforeEach (which resets store state) would re-render it and call
// the mocked useAudioPlayer again — polluting createdPlayers with phantom entries
// from a component this test no longer cares about.
let mountedUnmounts: Array<() => void> = [];
function renderHook<T>(useHook: () => T) {
  const rendered = baseRenderHook(useHook);
  // Idempotent: a test may unmount early to assert cleanup behaviour, and afterEach
  // unmounts everything unconditionally afterwards regardless.
  let unmounted = false;
  const unmountOnce = () => {
    if (unmounted) return;
    unmounted = true;
    rendered.unmount();
  };
  mountedUnmounts.push(unmountOnce);
  return { ...rendered, unmount: unmountOnce };
}

// The global setup mocks this module for every other test file so components can
// render without touching real playback (see test/setup.ts). This file unmocks it
// to exercise the real useAmbientAudio implementation directly.
//
// useSfx() is deliberately never invoked here, even unmocked: its `require('...wav')`
// calls are resolved by Metro's static asset transform at build time, which Vitest's
// Node/Vite pipeline cannot replicate — requiring a real .wav file throws a syntax
// error (binary content is not valid JS). The useSfx suite below re-implements its
// play() logic against the same mocked player instead, kept intentionally aligned
// with sfx.ts's actual behaviour (seekTo(0) reset, volume from the store, web no-op).
vi.unmock('@lib/utils/sfx');

const CROSSFADE_MS = 800;
const CROSSFADE_STEP_MS = 50;

// ─── Controllable mocks ──────────────────────────────────────────────────────

function makePlayer() {
  return {
    volume: 1,
    loop: false,
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn(),
    replace: vi.fn(),
  };
}

let createdPlayers: ReturnType<typeof makePlayer>[] = [];

vi.mock('expo-audio', () => ({
  useAudioPlayer: vi.fn(() => {
    const player = makePlayer();
    createdPlayers.push(player);
    return player;
  }),
}));

let simulatedAppState = 'active';
let appStateListener: ((next: string) => void) | null = null;

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    get currentState() {
      return simulatedAppState;
    },
    addEventListener: (_event: string, cb: (next: string) => void) => {
      appStateListener = cb;
      return {
        remove: () => {
          appStateListener = null;
        },
      };
    },
  },
}));

function backgroundApp() {
  act(() => {
    simulatedAppState = 'background';
    appStateListener?.('background');
  });
}

function foregroundApp() {
  act(() => {
    simulatedAppState = 'active';
    appStateListener?.('active');
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  createdPlayers = [];
  simulatedAppState = 'active';
  appStateListener = null;
  Platform.OS = 'ios';
  act(() => {
    useAppStore.setState({
      soundsEnabled: true,
      sfxVolume: 0.8,
      ambientEnabled: true,
      ambientVolume: 0.5,
    });
  });
});

afterEach(() => {
  for (const unmount of mountedUnmounts) unmount();
  mountedUnmounts = [];
  for (const key of Object.keys(AMBIENT_ASSETS)) delete AMBIENT_ASSETS[key];
  vi.clearAllMocks();
  vi.useRealTimers();
});

// ─── useSfx ───────────────────────────────────────────────────────────────────

/** Mirrors sfx.ts's play() body exactly — see the module note above for why. */
function createPlayFn(player: ReturnType<typeof makePlayer>) {
  return (_key: string) => {
    if (Platform.OS === 'web') return;

    const { soundsEnabled, sfxVolume } = useAppStore.getState();
    if (!soundsEnabled) return;

    player.volume = sfxVolume;
    player.seekTo(0);
    player.play();
  };
}

describe('useSfx play logic', () => {
  it('plays the requested sound with the current sfxVolume', () => {
    const player = makePlayer();
    createPlayFn(player)('correct-answer');

    expect(player.volume).toBe(0.8);
    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalledOnce();
  });

  it('does not play when soundsEnabled is false', () => {
    act(() => useAppStore.setState({ soundsEnabled: false }));
    const player = makePlayer();
    createPlayFn(player)('correct-answer');

    expect(player.play).not.toHaveBeenCalled();
  });

  it('uses the sfxVolume from the store', () => {
    act(() => useAppStore.setState({ sfxVolume: 0.3 }));
    const player = makePlayer();
    createPlayFn(player)('drop-chip');

    expect(player.volume).toBe(0.3);
    expect(player.play).toHaveBeenCalledOnce();
  });

  it('does not play on Web', () => {
    Platform.OS = 'web';
    const player = makePlayer();
    createPlayFn(player)('correct-answer');

    expect(player.play).not.toHaveBeenCalled();
  });

  it('still plays when sfxVolume is 0 — volume is a user choice, not a mute toggle', () => {
    act(() => useAppStore.setState({ sfxVolume: 0 }));
    const player = makePlayer();
    createPlayFn(player)('correct-answer');

    expect(player.volume).toBe(0);
    expect(player.play).toHaveBeenCalledOnce();
  });
});

// ─── useAmbientAudio ──────────────────────────────────────────────────────────

describe('useAmbientAudio', () => {
  beforeEach(() => {
    AMBIENT_ASSETS.forest = 101;
    AMBIENT_ASSETS.ocean = 102;
  });

  it('does nothing for an unregistered key', () => {
    renderHook(() => useAmbientAudio('unknown-key', true));
    act(() => vi.advanceTimersByTime(CROSSFADE_MS));

    for (const player of createdPlayers) {
      expect(player.play).not.toHaveBeenCalled();
      expect(player.replace).not.toHaveBeenCalled();
    }
  });

  it('does nothing while playing is false', () => {
    renderHook(() => useAmbientAudio('forest', false));

    for (const player of createdPlayers) expect(player.play).not.toHaveBeenCalled();
  });

  it('starts playback and fades in to ambientVolume', () => {
    let playing = false;
    const { rerender } = renderHook(() => useAmbientAudio('forest', playing));

    playing = true;
    rerender();

    const active = createdPlayers[0];
    expect(active.replace).toHaveBeenCalledWith(101);
    expect(active.loop).toBe(true);
    expect(active.play).toHaveBeenCalledOnce();
    expect(active.volume).toBe(0); // fade-in starts from 0

    act(() => vi.advanceTimersByTime(CROSSFADE_MS));
    expect(active.volume).toBeCloseTo(0.5);
  });

  it('fades out and pauses when playing flips to false', () => {
    let playing = true;
    const { rerender } = renderHook(() => useAmbientAudio('forest', playing));
    act(() => vi.advanceTimersByTime(CROSSFADE_MS)); // fully faded in

    const active = createdPlayers[0];
    playing = false;
    rerender();

    expect(active.pause).not.toHaveBeenCalled(); // fading out first, not cut

    act(() => vi.advanceTimersByTime(CROSSFADE_MS));
    expect(active.pause).toHaveBeenCalledOnce();
    expect(active.volume).toBeCloseTo(0);
  });

  it('crossfades: fades the old track out (and pauses it) while fading the new one in', () => {
    let audioKey = 'forest';
    const { rerender } = renderHook(() => useAmbientAudio(audioKey, true));
    act(() => vi.advanceTimersByTime(CROSSFADE_MS)); // forest fully faded in on slot A

    const forestPlayer = createdPlayers[0];
    const oceanPlayer = createdPlayers[1];
    expect(forestPlayer.volume).toBeCloseTo(0.5);

    audioKey = 'ocean';
    rerender();

    expect(oceanPlayer.replace).toHaveBeenCalledWith(102);
    expect(oceanPlayer.loop).toBe(true);
    expect(oceanPlayer.play).toHaveBeenCalledOnce();
    expect(oceanPlayer.volume).toBe(0);

    act(() => vi.advanceTimersByTime(CROSSFADE_MS));

    expect(oceanPlayer.volume).toBeCloseTo(0.5);
    expect(forestPlayer.volume).toBeCloseTo(0);
    expect(forestPlayer.pause).toHaveBeenCalledOnce();
  });

  it('does not play when the master soundsEnabled mute is off', () => {
    act(() => useAppStore.setState({ soundsEnabled: false }));
    renderHook(() => useAmbientAudio('forest', true));

    for (const player of createdPlayers) expect(player.play).not.toHaveBeenCalled();
  });

  it('does not play when ambientEnabled is off', () => {
    act(() => useAppStore.setState({ ambientEnabled: false }));
    renderHook(() => useAmbientAudio('forest', true));

    for (const player of createdPlayers) expect(player.play).not.toHaveBeenCalled();
  });

  it('applies a live ambientVolume change immediately, without a fade', () => {
    renderHook(() => useAmbientAudio('forest', true));
    act(() => vi.advanceTimersByTime(CROSSFADE_MS));

    const active = createdPlayers[0];
    expect(active.volume).toBeCloseTo(0.5);

    act(() => useAppStore.setState({ ambientVolume: 0.9 }));
    expect(active.volume).toBe(0.9);
  });

  it('pauses on background and resumes on foreground while playing is still true', () => {
    renderHook(() => useAmbientAudio('forest', true));
    act(() => vi.advanceTimersByTime(CROSSFADE_MS));

    const active = createdPlayers[0];
    expect(active.pause).not.toHaveBeenCalled();

    backgroundApp();
    act(() => vi.advanceTimersByTime(CROSSFADE_MS));
    expect(active.pause).toHaveBeenCalledOnce();

    foregroundApp();
    expect(active.play).toHaveBeenCalledTimes(2); // initial start + resume
  });

  it('stays paused on foreground if playing is no longer true', () => {
    let playing = true;
    const { rerender } = renderHook(() => useAmbientAudio('forest', playing));
    act(() => vi.advanceTimersByTime(CROSSFADE_MS));

    const active = createdPlayers[0];
    backgroundApp();
    act(() => vi.advanceTimersByTime(CROSSFADE_MS));

    playing = false;
    rerender();
    foregroundApp();

    expect(active.play).toHaveBeenCalledOnce(); // only the original start
  });

  it('does not play on Web', () => {
    Platform.OS = 'web';
    renderHook(() => useAmbientAudio('forest', true));

    for (const player of createdPlayers) expect(player.play).not.toHaveBeenCalled();
  });

  it('pauses both player slots on unmount even when no fade is in flight', () => {
    const { unmount } = renderHook(() => useAmbientAudio('forest', true));
    act(() => vi.advanceTimersByTime(CROSSFADE_MS)); // fade-in fully settled, nothing left to cancel

    const active = createdPlayers[0];
    const inactive = createdPlayers[1];
    expect(active.pause).not.toHaveBeenCalled();

    act(() => unmount());

    expect(active.pause).toHaveBeenCalledOnce();
    expect(inactive.pause).toHaveBeenCalledOnce();
  });

  it('does not throw on unmount when expo-audio already released a player slot', () => {
    const { unmount } = renderHook(() => useAmbientAudio('forest', true));
    act(() => vi.advanceTimersByTime(CROSSFADE_MS));

    const active = createdPlayers[0];
    const inactive = createdPlayers[1];
    active.pause.mockImplementation(() => {
      throw new Error('NativeSharedObjectNotFoundException');
    });

    expect(() => act(() => unmount())).not.toThrow();
    expect(inactive.pause).toHaveBeenCalledOnce();
  });

  it('applies a live volume change immediately mid fade-in, not reverted by the stale fade', () => {
    renderHook(() => useAmbientAudio('forest', true));
    // Stop partway through the 16-step fade-in — it must still be running.
    act(() => vi.advanceTimersByTime(CROSSFADE_STEP_MS * 4));

    const active = createdPlayers[0];
    expect(active.volume).toBeGreaterThan(0);
    expect(active.volume).toBeLessThan(0.5);

    act(() => useAppStore.setState({ ambientVolume: 0.9 }));
    expect(active.volume).toBe(0.9);

    // The stale fade-in must have been cancelled — letting it run to completion
    // must not overwrite the live value with its own stale target.
    act(() => vi.advanceTimersByTime(CROSSFADE_MS));
    expect(active.volume).toBe(0.9);
  });

  it('cancels a superseded crossfade fade-out so it cannot later pause a reused slot', () => {
    AMBIENT_ASSETS.river = 103;
    let audioKey = 'forest';
    const { rerender } = renderHook(() => useAmbientAudio(audioKey, true));
    act(() => vi.advanceTimersByTime(CROSSFADE_MS)); // forest settled on slot A (index 0)

    audioKey = 'ocean';
    rerender(); // crossfade: ocean fades in on slot B, forest fades out on slot A
    act(() => vi.advanceTimersByTime(CROSSFADE_STEP_MS * 2)); // both fades still in flight

    audioKey = 'river';
    rerender(); // interrupts again: river reuses slot A (forest's old slot)
    act(() => vi.advanceTimersByTime(CROSSFADE_MS)); // let everything settle

    const riverPlayer = createdPlayers[0]; // slot A now holds river
    expect(riverPlayer.pause).not.toHaveBeenCalled();
    expect(riverPlayer.volume).toBeCloseTo(0.5);
  });
});
