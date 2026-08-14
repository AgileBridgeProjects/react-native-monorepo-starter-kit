# Audio — SFX & Ambient — Standards

> Module: `apps/expo/src/lib/utils/sfx.ts` — single audio module for both one-shot
> SFX (`useSfx()`) and looping ambient tracks (`useAmbientAudio()`)
> Settings: `useAppStore` (Zustand + MMKV, device-local)

## Architecture

```text
assets/audio/          ← WAV files (< 1s for feedback, ≤ 2s for celebrations; loops any length)
src/lib/utils/sfx.ts   ← useSfx() + useAmbientAudio() — single entry point for all playback
src/store/app-store.ts ← soundsEnabled/sfxVolume + ambientEnabled/ambientVolume (0.0–1.0)
```

No component or hook calls `expo-audio` directly — everything goes through `sfx.ts`.

## Rules — SFX

### 1. All one-shot playback goes through `useSfx()`

Never call `expo-audio` directly in components. Always use:

```ts
const { play } = useSfx();
play('correct-answer');
```

### 2. Adding a new sound

1. Drop the WAV file into `apps/expo/assets/audio/`
2. Add a new `require('...wav')` + `useAudioPlayer(...)` call inside `useSfx()`'s body (not a
   module-level object — see the note in `sfx.ts`: keeping every `require()` inside the hook body
   means importing `useAmbientAudio` never forces Node/Vitest to load these binary assets) and add
   the key to `SFX_KEYS`
3. Wire the new player into the `players` map
4. Call `play('your-key')` at the appropriate event site

### 3. Audio file requirements

| Property | Requirement |
|---|---|
| Format | WAV (uncompressed, maximum compatibility) |
| Duration | ≤ 1 second for feedback SFX; ≤ 2 seconds for celebration/fanfare |
| Sample rate | 44.1 kHz |
| Channels | Mono (stereo wastes size for short SFX) |
| File size | < 100 KB per file |
| Naming | kebab-case matching the `SfxKey` (e.g. `drop-chip.wav`) |

### 4. User settings (device-local, no DB)

- **`soundsEnabled`** (`boolean`, default `true`) — master toggle; when `false`, all SFX are muted
- **`sfxVolume`** (`number`, 0.0–1.0, default `0.8`) — applied to `player.volume` before playback
- Both persisted via MMKV — survives app restarts, no backend storage needed
- Read via `useAppStore.getState()` at play-time (not reactive subscription) to avoid re-renders

### 5. Platform behaviour

| Platform | Behaviour |
|---|---|
| iOS | Respects silent/vibrate mode (`playsInSilentMode` defaults `false` in expo-audio) |
| Android | Respects system media volume; no AUDIO_FOCUS interruption for short SFX |
| Web | Graceful no-op (`Platform.OS === 'web'` early return) |

### 6. App Store compliance

- **No background audio** — SFX plays only while the app is foregrounded and user is actively
  playing; ambient loops enforce this the same way via the `AppState` background-pause in §5 below
- **User control** — volume sliders + mute switches in Settings (SFX and ambient independently;
  0 = still plays at that level, the switch is the actual mute); nothing plays without user consent
- **No autoplay on launch** — sounds only fire in response to user-initiated actions or an
  explicit `playing` flag from a screen already in progress (never on app open)
- **Accessible** — all feedback has a parallel visual/haptic cue (confetti, border glow, haptics)

### 7. When to play SFX

| Event | Sound Key | Condition |
|---|---|---|
| Answer evaluated as correct | `correct-answer` | Always when `lastAnswerCorrect === true` |
| Chip placed into a valid drop zone | `drop-chip` | On every successful drop (FIB, Match, Word Bucket) |
| Session results screen mounted | `session-complete` | Once on mount |

### 8. When NOT to play SFX

- Wrong answers — no dedicated "wrong" SFX (visual + haptic feedback is sufficient)
- Navigation / tab switches — avoid fatiguing the user
- Background / inactive state — never
- Loading / skeleton states — never

## Rules — Ambient

### 1. All looping playback goes through `useAmbientAudio()`

Paired with a `playing` flag from the caller (e.g. a Skill countdown timer) — the hook owns
start/stop/crossfade, this component only owns *whether* something should be playing:

```ts
useAmbientAudio(audioKey, state === 'running');
```

### 2. Adding a new ambient loop

1. Drop the (looping-safe, no audible seam) WAV file into `apps/expo/assets/audio/`
2. Add the key + require path to the `AMBIENT_ASSETS` registry in `sfx.ts`
3. No other code changes — `useAmbientAudio` resolves the key at call time; unknown/absent keys no-op

`AMBIENT_ASSETS` starts empty until the first ambient loop is authored; it is exported from
`sfx.ts` so tests can register a fake entry without a real bundled asset.

### 3. Seamless looping and crossfade

- Native `player.loop = true` guarantees a gapless loop point — no JS-side seam handling needed
- Switching `audioKey` while `playing` stays `true` crossfades (linear volume ramp, ~800ms) between
  two player slots instead of cutting; starting/stopping fades in/out the same way
- A live `ambientVolume`/`ambientEnabled`/`soundsEnabled` change while already playing applies
  immediately (direct volume set), not through a fade — only key changes and play/pause
  transitions animate

### 4. User settings (device-local, no DB)

- **`ambientEnabled`** (`boolean`, default `true`) — ambient-specific mute; independent of `soundsEnabled`
- **`ambientVolume`** (`number`, 0.0–1.0, default `0.5`) — applied to the active player's volume
- The master `soundsEnabled` toggle silences ambient too, regardless of `ambientEnabled` — a
  volume of `0` still plays (a deliberate low level), only the two mute booleans gate playback
- Both persisted via MMKV, read via a reactive `useAppStore` selector (not `getState()`) so an
  in-progress loop's volume updates live as the user drags the Settings slider

### 5. Backgrounding

Ambient playback pauses automatically when the app backgrounds (`AppState` listener) and resumes
on foreground only if the caller's `playing` flag is still `true` — never plays while backgrounded.

### 6. Platform behaviour

Same as SFX (§5 above): iOS/Android defer to `expo-audio`'s native silent-mode/media-volume
handling, Web no-ops via the same `Platform.OS === 'web'` guard.

## Testing

- Mock `expo-audio` in unit tests: `vi.mock('expo-audio', ...)`
- SFX: assert `player.play()` is called with correct volume and `seekTo(0)` was called before play
- Ambient: assert `replace`/`loop`/`play` on start, `pause` after a full fade-out on stop, and both
  the outgoing and incoming player's volume at the end of a crossfade
- Assert no playback when `soundsEnabled = false` (and, for ambient, `ambientEnabled = false`)
- Assert no playback when `Platform.OS === 'web'`
- Assert ambient pauses on background and resumes on foreground only while `playing` is still true
- Test file: `__tests__/src/lib/utils/sfx.test.ts`. `useAmbientAudio` is unmocked and exercised for
  real (`vi.unmock('@lib/utils/sfx')`). `useSfx()` is never invoked directly under Vitest — its
  `require('...wav')` calls are resolved by Metro's static asset transform at build time, which
  Node/Vite cannot replicate (requiring a real `.wav` throws, since binary content isn't valid JS);
  its suite re-implements `play()`'s logic against the same mocked player instead, kept
  intentionally aligned with the real body
- A hook rendered via the shared `renderHook` test helper must be unmounted at the end of the test —
  an ambient hook stays subscribed to the store, so a later test's store reset would otherwise
  re-render it and call the mocked `useAudioPlayer` again, polluting a shared player-tracking array

## Performance

- SFX: all sounds are pre-loaded via `useAudioPlayer` (no lazy loading / no network fetch);
  `seekTo(0)` resets before replay so rapid re-triggers replay from the start instead of layering
- Ambient: two fixed player slots ping-pong as "active"/"incoming" so a crossfade never allocates
  a third player
- No `await` on `play()` — fire-and-forget to avoid blocking the UI thread
