import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { server } from './mocks/server';

// Define React Native globals that are injected by Metro/Expo but absent in Vitest
(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = true;
// biome-ignore lint/suspicious/noConsole: test setup intentionally filters known renderer noise
const originalConsoleError = console.error;

/** Latest Reanimated frame-loop activation calls, exposed for lifecycle tests. */
export const reanimatedFrameLoopSetActive = vi.fn();
/**
 * The most recently registered `useFrameCallback` worklet. Nothing drives it
 * under test (there is no UI thread), so a test that needs to assert what ONE
 * frame does to a shared value calls it itself.
 */
export const reanimatedFrameLoop: {
  callback: ((frame: { timeSincePreviousFrame: number | null }) => void) | null;
} = { callback: null };
const suppressedReactTestMessages = [
  'react-test-renderer is deprecated',
  'The current testing environment is not configured to support act(...)',
];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

console.error = (...args: unknown[]) => {
  const [firstArg] = args;
  if (
    typeof firstArg === 'string' &&
    suppressedReactTestMessages.some((message) => firstArg.includes(message))
  ) {
    return;
  }

  originalConsoleError(...args);
};

// ─── Browser API Polyfills ───────────────────────────────────────────────────
// requestAnimationFrame is used by CountingText and Reanimated internals.
// Node/jsdom does not provide it — shim with setTimeout so effects can run.
if (!globalThis.requestAnimationFrame) {
  (
    globalThis as typeof globalThis & {
      requestAnimationFrame: (cb: FrameRequestCallback) => number;
    }
  ).requestAnimationFrame = (callback: FrameRequestCallback): number =>
    setTimeout(() => callback(Date.now()), 16) as unknown as number;
  (
    globalThis as typeof globalThis & {
      cancelAnimationFrame: (id: number | null | undefined) => void;
    }
  ).cancelAnimationFrame = (id: number | null | undefined): void => {
    if (id != null) clearTimeout(id);
  };
}

// ─── Deterministic number formatting ──────────────────────────────────────────
// `Number.prototype.toLocaleString()` with no explicit locale follows the host's
// ICU default locale, which differs across machines (e.g. en-ZA space-grouping
// "1 250" locally vs en-US comma-grouping "1,250" on Linux CI). That makes any
// snapshot containing a number >= 1000 non-portable. Force a stable default locale
// so snapshots match everywhere. Explicit-locale calls (e.g. the shared formatters)
// are untouched.
// biome-ignore lint/suspicious/noExplicitAny: monkeypatching a built-in for snapshot determinism
const numberProto = Number.prototype as any;
const originalToLocaleString = numberProto.toLocaleString;
numberProto.toLocaleString = function (locales?: unknown, options?: unknown) {
  return originalToLocaleString.call(this, locales ?? 'en-US', options);
};

// ─── MSW Server Lifecycle ────────────────────────────────────────────────────
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
afterAll(() => {
  console.error = originalConsoleError;
});

// Mock @lib/supabase/config globally — importing the real module constructs a live
// GoTrue client at module load, which (a) pulls in `react-native-url-polyfill/auto`
// (whose `auto.js` fails to resolve under Vitest's Node resolver) and (b) eagerly
// loads a session via AsyncStorage, touching `window` (undefined in the Node env)
// and emitting an unhandled rejection. Any test that transitively imports the
// supabase config would otherwise break at collection/runtime. Tests that need to
// assert on supabase behaviour override this with their own `vi.mock`/`vi.doMock`.
vi.mock('@lib/supabase/config', () => ({
  supabase: {
    auth: {
      startAutoRefresh: vi.fn(),
      stopAutoRefresh: vi.fn(),
      refreshSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      updateUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      signInWithPassword: vi.fn(),
      signInWithIdToken: vi.fn(),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(async () => ({ error: null })),
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

// ─── React Native Mocks ─────────────────────────────────────────────────────
// Mock react-native and related Expo modules so Vite never tries to parse them.
// Do NOT use vi.importActual('react-native') — its index.js contains
// Flow type syntax (import typeof) that Vite cannot parse.
// Mock expo-router
vi.mock('expo-router', async () => {
  const ReactModule = await import('react');
  type ReactModuleShape = typeof import('react');
  const React = (ReactModule as unknown as { default?: ReactModuleShape }).default ?? ReactModule;

  return {
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
    })),
    useLocalSearchParams: vi.fn(() => ({})),
    // Inert event surface — tests have no navigation lifecycle to intercept.
    useNavigation: vi.fn(() => ({
      addListener: vi.fn(() => () => {}),
      dispatch: vi.fn(),
    })),
    // Runs the focus callback as a plain effect — tests have no navigation focus events.
    useFocusEffect: (effect: () => void) => {
      React.useEffect(effect, [effect]);
    },
    Link: 'Link',
    Stack: {
      Screen: 'Screen',
    },
  };
});

// Mock react-native-gesture-handler — native gesture machinery has no jsdom
// equivalent; gestures are asserted through their JS side-effects instead.
vi.mock('react-native-gesture-handler', async () => {
  const ReactModule = await import('react');
  type ReactModuleShape = typeof import('react');
  const React = (ReactModule as unknown as { default?: ReactModuleShape }).default ?? ReactModule;

  /**
   * Every gesture built with `.withTestId(...)`, newest wins — the one seam a
   * test has for driving a gesture, since there is no jsdom equivalent for a
   * drag. Read it with `gestureByTestId` from `test/utils/gestures`.
   */
  const taggedGestures = new Map<string, unknown>();

  /**
   * Chainable builder so `Gesture.Pan().onBegin(...).onUpdate(...)` composes.
   * Config setters are no-ops; the callbacks are recorded on `handlers` so a
   * test can invoke them, and `enabled` is recorded so it can assert on arming.
   */
  const chainableGesture = () => {
    const handlers: Record<string, (event?: unknown) => unknown> = {};
    const gesture: Record<string, unknown> = { handlers, enabledFlag: true };
    const callbacks = ['onBegin', 'onStart', 'onUpdate', 'onEnd', 'onFinalize', 'onTouchesDown'];
    const config = [
      'activeOffsetX',
      'activeOffsetY',
      'failOffsetX',
      'failOffsetY',
      'minDistance',
      'maxDistance',
      'minDuration',
      'maxDuration',
      'numberOfTaps',
      'shouldCancelWhenOutside',
      'hitSlop',
    ];
    for (const method of callbacks) {
      gesture[method] = (fn: (event?: unknown) => unknown) => {
        handlers[method] = fn;
        return gesture;
      };
    }
    for (const method of config) {
      gesture[method] = () => gesture;
    }
    gesture.enabled = (value: boolean) => {
      gesture.enabledFlag = value;
      return gesture;
    };
    gesture.withTestId = (id: string) => {
      taggedGestures.set(id, gesture);
      return gesture;
    };
    return gesture;
  };

  return {
    /** Test-only seam — see `taggedGestures`. */
    __taggedGestures: taggedGestures,
    Gesture: {
      Pan: chainableGesture,
      Tap: chainableGesture,
      LongPress: chainableGesture,
      Race: (...gestures: unknown[]) => gestures[0],
      Exclusive: (...gestures: unknown[]) => gestures[0],
      Simultaneous: (...gestures: unknown[]) => gestures[0],
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    // Renders both the row and its action panel(s) unconditionally, rather than gating them
    // behind a real drag — there's no jsdom equivalent for a swipe, so tests exercise the
    // revealed action by firing a press directly instead of simulating the gesture.
    Swipeable: React.forwardRef(
      (
        {
          children,
          renderLeftActions,
          renderRightActions,
        }: {
          children: React.ReactNode;
          renderLeftActions?: () => React.ReactNode;
          renderRightActions?: () => React.ReactNode;
        },
        ref: React.Ref<{ close: () => void }>,
      ) => {
        React.useImperativeHandle(ref, () => ({ close: () => {} }));
        return React.createElement(React.Fragment, null, [
          React.createElement(React.Fragment, { key: 'left' }, renderLeftActions?.()),
          React.createElement(React.Fragment, { key: 'children' }, children),
          React.createElement(React.Fragment, { key: 'right' }, renderRightActions?.()),
        ]);
      },
    ),
  };
});

// Mock expo-updates — no OTA machinery in tests; per-test behaviour via vi.mocked()
vi.mock('expo-updates', () => ({
  isEnabled: true,
  useUpdates: vi.fn(() => ({ isUpdateAvailable: false, isUpdatePending: false })),
  checkForUpdateAsync: vi.fn(async () => ({ isAvailable: false })),
  fetchUpdateAsync: vi.fn(async () => ({ isNew: true })),
  reloadAsync: vi.fn(async () => undefined),
}));

// Mock sonner-native — ships untransformed syntax Node cannot parse under
// Vitest, so any component importing @lib/toast would fail at collection.
// Tests asserting on toast behaviour override this with their own vi.mock.
vi.mock('sonner-native', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: 'Toaster',
}));

// Mock expo-haptics
vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(),
  selectionAsync: vi.fn(),
  notificationAsync: vi.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock expo-audio — returns a no-op player for all sounds
vi.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    volume: 1,
    currentTime: 0,
    loop: false,
    play: vi.fn(),
    pause: vi.fn(),
  }),
}));

// Mock expo-video — message attachment previews use a paused native player; individual tests
// can replace this with an interaction-aware mock when they need to inspect player behaviour.
vi.mock('expo-video', () => ({
  VideoView: 'VideoView',
  useVideoPlayer: vi.fn(() => ({ muted: false, pause: vi.fn() })),
}));

// Mock sfx/ambient audio utility — avoids require('...wav') parse errors in Node.
// Tests asserting on the real playback logic (sfx.test.ts) unmock this themselves.
vi.mock('@lib/utils/sfx', () => ({
  useSfx: () => ({ play: vi.fn() }),
  useAmbientAudio: vi.fn(),
}));

// Mock @expo/ui's community Slider — native SwiftUI/Compose view with no jsdom
// equivalent. Exposes value/onValueChange as plain host-element props so tests
// can assert on and drive it the same way they do the react-native Switch mock.
vi.mock('@expo/ui/community/slider', async () => {
  const ReactModule = await import('react');
  type ReactModuleShape = typeof import('react');
  const React = (ReactModule as unknown as { default?: ReactModuleShape }).default ?? ReactModule;

  return {
    default: (props: Record<string, unknown>) => React.createElement('Slider', props),
  };
});

vi.mock('@react-native-vector-icons/material-icons/static', () => ({
  default: 'MaterialIcons',
}));

vi.mock('@react-native-vector-icons/material-design-icons/static', () => ({
  default: 'MaterialCommunityIcons',
}));

vi.mock('@react-native-vector-icons/ionicons/static', () => ({
  default: 'Ionicons',
}));

vi.mock('@react-native-vector-icons/fontawesome/static', () => ({
  default: 'FontAwesome',
}));

vi.mock('expo-symbols', () => ({
  SymbolView: 'SymbolView',
}));

vi.mock('expo-localization', () => ({
  getLocales: vi.fn(() => [{ languageTag: 'en-ZA' }]),
}));

// Mock expo-secure-store — in-memory shim so interceptors and storage work in tests
vi.mock('expo-secure-store', () => {
  let store: Record<string, string> = {};
  return {
    getItemAsync: vi.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItemAsync: vi.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: vi.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    __reset: () => {
      store = {};
    },
  };
});

// Mock expo-crypto — deterministic UUID so encryption-key generation is stable in tests
vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'test-1111-2222-3333-444444444444'),
}));

// Mock react-native-mmkv — provides an in-memory shim for tests
vi.mock('react-native-mmkv', () => {
  const stores = new Map<string, Map<string, string>>();

  class MMKVMock {
    private store: Map<string, string>;

    constructor({ id = 'default' }: { id?: string } = {}) {
      if (!stores.has(id)) stores.set(id, new Map());
      this.store = stores.get(id) ?? new Map();
    }

    set(key: string, value: string | number | boolean) {
      this.store.set(key, String(value));
    }
    getString(key: string) {
      return this.store.get(key) ?? undefined;
    }
    getNumber(key: string) {
      const v = this.store.get(key);
      return v !== undefined ? Number(v) : undefined;
    }
    getBoolean(key: string) {
      const v = this.store.get(key);
      return v !== undefined ? v === 'true' : undefined;
    }
    delete(key: string) {
      this.store.delete(key);
    }
    remove(key: string) {
      return this.store.delete(key);
    }
    contains(key: string) {
      return this.store.has(key);
    }
    getAllKeys() {
      return [...this.store.keys()];
    }
    clearAll() {
      this.store.clear();
    }
  }

  return {
    MMKV: MMKVMock,
    createMMKV: (config?: { id?: string }) => new MMKVMock(config),
  };
});

// Mock @react-native-community/netinfo — query-client.ts wires onlineManager to it at module
// level; without this mock the native module fails to parse in the Node.js test environment.
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: vi.fn(() => vi.fn()), // returns unsubscribe no-op
    fetch: vi.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
}));

// Mock react-native-reanimated — Vitest cannot resolve its native internals
vi.mock('react-native-reanimated', async () => {
  const ReactModule = await import('react');
  type ReactModuleShape = typeof import('react');
  const React = (ReactModule as unknown as { default?: ReactModuleShape }).default ?? ReactModule;

  const Animated = {
    createAnimatedComponent: (component: unknown) => component,
    View: 'View',
    Text: 'Text',
    Image: 'Image',
  };

  /**
   * Entering/exiting animation builder whose every modifier returns itself, so
   * any chain — `FadeInDown.delay(200).duration(500).springify()` — composes.
   */
  const chainableEnteringAnimation = () => {
    const animation: Record<string, () => unknown> = {};
    const modifiers = [
      'duration',
      'delay',
      'springify',
      'damping',
      'stiffness',
      'mass',
      'easing',
      'withInitialValues',
      'reduceMotion',
      'build',
    ];
    for (const modifier of modifiers) {
      animation[modifier] = () => animation;
    }
    return animation;
  };

  return {
    default: Animated,
    // Stable across renders, like the real hook: a fresh object per render would
    // discard anything an effect wrote to `.value`, so no test could observe a
    // value the component animates to after mount.
    useSharedValue: (initial: unknown) => {
      const ref = React.useRef<{ value: unknown } | null>(null);
      if (ref.current === null) ref.current = { value: initial };
      return ref.current;
    },
    useReducedMotion: () => false,
    useAnimatedStyle: (fn: () => unknown) => {
      try {
        return fn();
      } catch {
        return {};
      }
    },
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    // Animated SVG attributes. Evaluated once so components relying on the returned object
    // mount; the real per-frame updates only ever happen on the UI thread.
    useAnimatedProps: (fn: () => unknown) => {
      try {
        return fn();
      } catch {
        return {};
      }
    },
    // Reactions fire off UI-thread value changes, which never happen under test. Running the
    // prepare function once and discarding it keeps components mountable without pretending
    // the reaction ever triggers.
    useAnimatedReaction: (prepare: () => unknown, _react: unknown) => {
      try {
        prepare();
      } catch {
        // Prepare may read values that only exist on the UI thread.
      }
    },
    // Decay has no resting value to return, so yield the current one and report the animation
    // as finished — callers chain their settle step off that callback.
    withDecay: (_config: unknown, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return 0;
    },
    // Frame loops never run under test — the callback is driven by the native UI thread.
    // Returning an inert handle lets components mount and be asserted on statically;
    // the callback is exposed so a test can step one frame by hand.
    useFrameCallback: (
      callback: (frame: { timeSincePreviousFrame: number | null }) => void,
      _autostart?: boolean,
    ) => {
      reanimatedFrameLoop.callback = callback;
      return {
        setActive: reanimatedFrameLoopSetActive,
        isActive: false,
        callbackId: 0,
      };
    },
    withTiming: (value: unknown) => value,
    withSpring: (value: unknown) => value,
    withDelay: (_delay: unknown, animation: unknown) => animation,
    withSequence: (...animations: unknown[]) => animations[animations.length - 1],
    runOnJS: (fn: unknown) => fn,
    cancelAnimation: vi.fn(),
    withRepeat: (_animation: unknown, _count: unknown, _reverse: unknown) => _animation,
    interpolateColor: (_value: unknown, _input: unknown, output: string[]) => output[0],
    FadeIn: chainableEnteringAnimation(),
    FadeInDown: chainableEnteringAnimation(),
    FadeOut: chainableEnteringAnimation(),
    ZoomIn: chainableEnteringAnimation(),
    SlideInDown: chainableEnteringAnimation(),
    SlideInRight: chainableEnteringAnimation(),
    SlideOutRight: chainableEnteringAnimation(),
    Easing: {
      out: (fn: unknown) => fn,
      in: (fn: unknown) => fn,
      inOut: (fn: unknown) => fn,
      cubic: (t: number) => t,
      quad: (t: number) => t,
      sin: (t: number) => t,
      linear: (t: number) => t,
      bezier: () => (t: number) => t,
    },
  };
});

// ─── UI Component Mocks ──────────────────────────────────────────────────────
// Mock @/components/ui globally so component tests never render real NativeWind
// primitives that would fail in jsdom. Individual test files may override this
// with vi.mock('@/components/ui', ...) if they need component-specific behaviour.
// Uses React.createElement with the string types exposed by the react-native mock
// ('Text', 'Pressable', etc.) so that helpers like findAllByType(Text) still work.
vi.mock('@/components/ui', async () => {
  const ReactModule = await import('react');
  type ReactModuleShape = typeof import('react');
  // Support both ESM default export and CJS module shapes
  const React = (ReactModule as unknown as { default?: ReactModuleShape }).default ?? ReactModule;
  // biome-ignore lint/suspicious/noExplicitAny: required to use RN string element types
  const h = React.createElement as (...args: any[]) => unknown;

  return {
    // Real value, not a mocked component — consumers compute a pixel cap from it
    // (`windowHeight * BOTTOM_SHEET_BODY_MAX_HEIGHT_RATIO`), so it must resolve to a number.
    BOTTOM_SHEET_BODY_MAX_HEIGHT_RATIO: 0.6,
    AnchoredFooter: ({ children, testID }: { children?: unknown; testID?: string }) =>
      h('View', { testID }, children),

    WizardFooter: ({
      backLabel,
      backTestId,
      showBack,
      onBack,
      primaryLabel,
      primaryTestId,
      isSubmitting,
      primaryDisabled,
      onSubmit,
    }: {
      backLabel?: string;
      backTestId?: string;
      showBack?: boolean;
      onBack?: () => void;
      primaryLabel?: string;
      primaryTestId?: string;
      isSubmitting?: boolean;
      primaryDisabled?: boolean;
      onSubmit?: () => void;
    }) =>
      h(
        'View',
        null,
        showBack &&
          backLabel &&
          h('Pressable', { onPress: onBack, testID: backTestId }, h('Text', null, backLabel)),
        h(
          'Pressable',
          {
            onPress: onSubmit,
            testID: primaryTestId,
            disabled: primaryDisabled,
            accessibilityState: { disabled: primaryDisabled, busy: isSubmitting },
          },
          h('Text', null, primaryLabel),
        ),
      ),
    Alert: ({
      message,
      testID,
    }: {
      message?: string | null;
      testID?: string;
      variant?: string;
      className?: string;
    }) => (message != null ? h('Text', { testID }, message) : null),

    Card: ({
      children,
      testID,
      className,
    }: {
      children?: unknown;
      testID?: string;
      className?: string;
    }) => h('View', { testID, className }, children),

    Button: ({
      children,
      onPress,
      testID,
      disabled,
    }: {
      children?: unknown;
      onPress?: () => void;
      testID?: string;
      disabled?: boolean;
      fullWidth?: boolean;
      variant?: string;
      size?: string;
    }) =>
      h(
        'Pressable',
        { onPress, testID, disabled, accessibilityState: { disabled } },
        h('Text', null, children),
      ),

    Typography: ({
      children,
      testID,
    }: {
      children?: unknown;
      testID?: string;
      variant?: string;
      className?: string;
    }) => h('Text', { testID }, children),

    // `onFocus`/`onBlur` are wired through: some screens arm or disarm
    // behaviour on focus (the serve step only lets you swipe the field up once
    // the keyboard is down), so focus is more than a border colour.
    Input: ({
      accessibilityLabel,
      editable,
      maxLength,
      multiline,
      onBlur,
      onChangeText,
      onFocus,
      placeholder,
      testID,
      value,
    }: {
      accessibilityLabel?: string;
      editable?: boolean;
      maxLength?: number;
      multiline?: boolean;
      onBlur?: () => void;
      onChangeText?: (value: string) => void;
      onFocus?: () => void;
      placeholder?: string;
      testID?: string;
      value?: string;
      [key: string]: unknown;
    }) =>
      h('TextInput', {
        accessibilityLabel,
        editable,
        maxLength,
        multiline,
        onBlur,
        onChangeText,
        onFocus,
        placeholder,
        testID,
        value,
      }),

    FormField: ({ testID }: { testID?: string; [key: string]: unknown }) => h('View', { testID }),

    HairlineSeparator: () => h('View', null),

    Icon: ({ testID }: { testID?: string; [key: string]: unknown }) => h('View', { testID }),

    // Keeps its testID reachable: callers hang list-row and empty-state testIDs off the circle.
    IconCircle: ({ testID }: { testID?: string; [key: string]: unknown }) => h('View', { testID }),

    ProgressBar: ({ testID }: { testID?: string; value?: number; className?: string }) =>
      h('View', { testID }),

    PageScrollView: ({
      children,
      testID,
    }: {
      children?: unknown;
      testID?: string;
      title?: string;
      description?: string;
    }) => h('View', { testID }, children),

    StatBlock: ({
      label,
      value,
      testID,
    }: {
      label?: string;
      value?: string | number;
      icon?: string;
      color?: string;
      className?: string;
      testID?: string;
    }) => h('View', { testID, accessibilityLabel: `${label}: ${value}` }),

    DonutStat: ({
      label,
      value,
      total,
      hideRing,
      testID,
    }: {
      label?: string;
      value?: number | string;
      total?: number;
      hideRing?: boolean;
      subLabel?: string;
      icon?: string;
      color?: string;
      isLoading?: boolean;
      className?: string;
      testID?: string;
    }) =>
      h('View', {
        testID,
        accessibilityLabel: hideRing ? `${label}: ${value}` : `${label}: ${value}/${total}`,
      }),

    PuzzleSelector: ({
      puzzleOptions,
      selectedPuzzleId,
      onSelectPuzzle,
      heading,
      selectorTestId,
      getPuzzleOptionTestId,
    }: {
      puzzleOptions: Array<{ id: string; label: string }>;
      selectedPuzzleId: string;
      onSelectPuzzle: (id: string) => void;
      heading: string;
      selectorTestId: string;
      getPuzzleOptionTestId: (id: string) => string;
    }) =>
      h(
        'View',
        { testID: selectorTestId },
        h('Text', null, heading),
        ...puzzleOptions.map((option) =>
          h(
            'Pressable',
            {
              key: option.id,
              testID: getPuzzleOptionTestId(option.id),
              onPress: () => onSelectPuzzle(option.id),
              accessibilityState: { selected: option.id === selectedPuzzleId },
            },
            h('Text', null, option.label),
          ),
        ),
      ),

    Avatar: ({ initials, testID }: { initials?: string; size?: string; testID?: string }) =>
      h('View', { testID }, h('Text', null, initials)),

    DownloadStateButton: ({ testID }: { testID?: string; [key: string]: unknown }) =>
      h('View', { testID }),

    GradientBackground: ({
      children,
      testID,
      className,
    }: {
      children?: unknown;
      testID?: string;
      className?: string;
    }) => h('View', { testID, className }, children),

    ResponsiveGrid: ({
      data,
      renderItem,
      ListHeaderComponent,
      testID,
    }: {
      data?: unknown[];
      renderItem?: (info: { item: unknown; index: number }) => unknown;
      ListHeaderComponent?: unknown;
      testID?: string;
      [key: string]: unknown;
    }) =>
      h(
        'View',
        { testID },
        ListHeaderComponent,
        ...(data ?? []).map((item, index) => renderItem?.({ item, index })),
      ),

    IconSelectCard: ({
      label,
      selected,
      onPress,
      testID,
    }: {
      icon?: string;
      iconColor?: string;
      label?: string;
      selected?: boolean;
      onPress?: () => void;
      testID?: string;
    }) =>
      h(
        'Pressable',
        { onPress, testID, accessibilityState: { selected: Boolean(selected) } },
        h('Text', null, label),
      ),
    Skeleton: ({ testID }: { testID?: string; shape?: string; className?: string }) =>
      h('View', { testID }),
    InlineDatePicker: ({
      value,
      onChange,
      testID,
    }: {
      value?: Date;
      onChange?: (date: Date) => void;
      maximumDate?: Date;
      minimumDate?: Date;
      testID?: string;
    }) =>
      h('View', {
        testID,
        value,
        onChange: (_: unknown, date?: Date) => date && onChange?.(date),
      }),
    ActionSheet: ({ visible, children }: { visible?: boolean; children?: unknown }) =>
      visible ? h('View', { testID: 'action-sheet' }, children) : null,
    BottomSheet: ({
      visible,
      onClose,
      title,
      subtitle,
      closeLabel,
      children,
      footer,
      testID,
    }: {
      visible?: boolean;
      onClose?: () => void;
      title?: string;
      subtitle?: string;
      closeLabel?: string;
      children?: unknown;
      footer?: unknown;
      testID?: string;
    }) =>
      visible
        ? h(
            'View',
            { testID },
            h('Text', null, title),
            subtitle ? h('Text', null, subtitle) : null,
            h(
              'Pressable',
              { onPress: onClose, accessibilityRole: 'button', accessibilityLabel: closeLabel },
              h('Text', null, closeLabel),
            ),
            children,
            footer ?? null,
          )
        : null,
    ModalSheet: ({
      visible,
      onClose,
      title,
      subtitle,
      closeLabel,
      children,
      footer,
      testID,
    }: {
      visible?: boolean;
      onClose?: () => void;
      title?: string;
      subtitle?: string;
      closeLabel?: string;
      children?: unknown;
      footer?: unknown;
      testID?: string;
    }) =>
      visible
        ? h(
            'View',
            { testID },
            h('Text', null, title),
            subtitle ? h('Text', null, subtitle) : null,
            h(
              'Pressable',
              { onPress: onClose, accessibilityRole: 'button', accessibilityLabel: closeLabel },
              h('Text', null, closeLabel),
            ),
            children,
            footer ?? null,
          )
        : null,
    OptionSheet: ({
      visible,
      onClose,
      title,
      closeLabel,
      options,
      selectedValue,
      onSelect,
      testID,
      optionTestID,
    }: {
      visible?: boolean;
      onClose?: () => void;
      title?: string;
      closeLabel?: string;
      options?: Array<{ value: string; label: string }>;
      selectedValue?: string;
      onSelect?: (value: string) => void;
      bodyMaxHeight?: number;
      testID?: string;
      optionTestID?: (value: string) => string;
    }) =>
      visible
        ? h(
            'View',
            { testID },
            h('Text', null, title),
            h(
              'Pressable',
              { onPress: onClose, accessibilityRole: 'button', accessibilityLabel: closeLabel },
              h('Text', null, closeLabel),
            ),
            ...(options ?? []).map((option) =>
              h(
                'Pressable',
                {
                  key: option.value,
                  testID: optionTestID?.(option.value),
                  onPress: () => onSelect?.(option.value),
                  accessibilityRole: 'button',
                  accessibilityState: { selected: option.value === selectedValue },
                },
                h('Text', null, option.label),
              ),
            ),
          )
        : null,
    // State machine mirroring the real AsyncStateView precedence.
    AsyncStateView: ({
      data,
      isLoading,
      isError,
      isEmpty,
      loadingView,
      errorTitle,
      errorActionLabel,
      onErrorAction,
      emptyTitle,
      emptyMessage,
      renderContent,
    }: {
      data?: unknown;
      isLoading?: boolean;
      isError?: boolean;
      isEmpty?: boolean;
      loadingView?: unknown;
      errorTitle?: string;
      errorActionLabel?: string;
      onErrorAction?: () => void;
      emptyTitle?: string;
      emptyMessage?: string;
      renderContent?: (data: unknown) => unknown;
      [key: string]: unknown;
    }) => {
      if (isLoading) return loadingView ?? h('View', { testID: 'async-loading' });
      if (isError)
        return h(
          'View',
          { testID: 'async-error' },
          errorTitle ? h('Text', null, errorTitle) : null,
          errorActionLabel
            ? h(
                'Pressable',
                { testID: 'async-error-action', onPress: onErrorAction },
                h('Text', null, errorActionLabel),
              )
            : null,
        );
      if (isEmpty)
        return h(
          'View',
          { testID: 'async-empty' },
          emptyTitle ? h('Text', null, emptyTitle) : null,
          emptyMessage ? h('Text', null, emptyMessage) : null,
        );
      return data != null && renderContent ? renderContent(data) : null;
    },

    KeyboardDismissView: ({ children }: { children?: unknown }) => h('View', null, children),

    BouncePressable: ({
      children,
      onPress,
      testID,
      accessibilityLabel,
      className,
    }: {
      children?: unknown;
      onPress?: () => void;
      testID?: string;
      accessibilityLabel?: string;
      className?: string;
    }) =>
      h(
        'Pressable',
        { onPress, testID, accessibilityLabel, accessibilityRole: 'button', className },
        children,
      ),

    RatingSlider: ({
      value,
      min,
      max,
      prompt,
      ordinalLabel,
      testID,
    }: {
      value: number | null;
      min: number;
      max: number;
      prompt?: string;
      ordinalLabel?: string;
      testID?: string;
      onChange?: (next: number) => void;
      [key: string]: unknown;
    }) =>
      h(
        'View',
        { testID, accessibilityRole: 'adjustable', accessibilityValue: { min, max, now: value } },
        ordinalLabel ? h('Text', null, ordinalLabel) : null,
        prompt ? h('Text', null, prompt) : null,
        h('Text', null, value === null ? '–' : String(value)),
      ),

    StoryProgressBar: ({
      total,
      current,
      testID,
    }: {
      total: number;
      current: number;
      testID?: string;
      className?: string;
    }) => h('View', { testID, accessibilityValue: { min: 1, max: total, now: current + 1 } }),

    AnimatedProgressBar: ({
      value,
      testID,
    }: {
      value: number;
      testID?: string;
      [key: string]: unknown;
    }) => h('View', { testID, accessibilityValue: { min: 0, max: 100, now: value } }),

    StatusChip: ({
      label,
      testID,
      containerClassName,
    }: {
      label: string;
      testID?: string;
      containerClassName?: string;
      [key: string]: unknown;
    }) => h('View', { testID, className: containerClassName }, h('Text', null, label)),

    OptionCardRow: ({
      letter,
      label,
      selected,
      onPress,
      disabled,
      testID,
    }: {
      letter: string;
      label: string;
      selected: boolean;
      onPress: () => void;
      disabled?: boolean;
      testID?: string;
    }) =>
      h(
        'Pressable',
        {
          onPress,
          disabled,
          testID,
          accessibilityRole: 'radio',
          accessibilityLabel: label,
          accessibilityState: { selected, disabled },
        },
        h('Text', null, letter),
        h('Text', null, label),
      ),

    GlowBadge: ({ testID }: { testID?: string; [key: string]: unknown }) => h('View', { testID }),

    TapHint: ({ label }: { label: string }) => h('Text', null, label),

    CheckboxIndicator: ({
      checked,
      disabled,
    }: {
      checked: boolean;
      disabled?: boolean;
      variant?: string;
    }) => h('View', { accessibilityState: { checked, disabled } }),

    SegmentedTabs: ({
      items,
      selectedValue,
      onSelectValue,
    }: {
      items: Array<{ value: string; label: string; testID?: string }>;
      selectedValue: string;
      onSelectValue: (next: string) => void;
      variant?: string;
    }) =>
      h(
        'View',
        null,
        ...items.map((item) =>
          h(
            'Pressable',
            {
              key: item.value,
              testID: item.testID,
              onPress: () => onSelectValue(item.value),
              accessibilityState: { selected: item.value === selectedValue },
            },
            h('Text', null, item.label),
          ),
        ),
      ),

    Stepper: ({
      currentStep,
      totalSteps,
      testID,
    }: {
      currentStep: number;
      totalSteps: number;
      testID?: string;
    }) => h('View', { testID }, h('Text', null, `${currentStep}/${totalSteps}`)),
  };
});

// Mock expo-file-system — ships TypeScript source in v55; Vitest cannot strip types from
// node_modules. Provide minimal shims for the class-based API used by use-topic-downloads.
vi.mock('expo-file-system/legacy', () => ({
  createDownloadResumable: vi.fn(
    (
      _url: string,
      _fileUri: string,
      _opts?: unknown,
      callback?: (data: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void,
    ) => ({
      downloadAsync: vi.fn(async () => {
        callback?.({ totalBytesWritten: 100, totalBytesExpectedToWrite: 100 });
        return { uri: _fileUri, status: 200 };
      }),
      pauseAsync: vi.fn(),
      resumeAsync: vi.fn(),
      cancelAsync: vi.fn(),
      savable: vi.fn(() => ({ url: _url, fileUri: _fileUri })),
    }),
  ),
  deleteAsync: vi.fn(() => Promise.resolve()),
  getInfoAsync: vi.fn(() => Promise.resolve({ exists: false, isDirectory: false, uri: '' })),
  makeDirectoryAsync: vi.fn(() => Promise.resolve()),
  documentDirectory: '/mock-documents/',
  cacheDirectory: '/mock-cache/',
}));

vi.mock('expo-file-system', () => {
  class FileMock {
    uri: string;
    constructor(..._args: unknown[]) {
      this.uri = 'file://mock';
    }
    async delete() {}
    async downloadFileAsync(_url: string, _options?: unknown) {}
    get exists() {
      return false;
    }
  }
  class DirectoryMock {
    uri: string;
    constructor(..._args: unknown[]) {
      this.uri = 'file://mock-dir/';
    }
    async create() {}
  }
  const Paths = { cache: 'file://mock-cache/' };
  return { File: FileMock, Directory: DirectoryMock, Paths };
});

// Mock expo-glass-effect — native module with no JS fallback under Vitest. Reports the glass
// material as unavailable so components render their cross-platform branch, which is the one
// tests can meaningfully assert on.
vi.mock('expo-glass-effect', async () => {
  const ReactModule = await import('react');
  type ReactModuleShape = typeof import('react');
  const React = (ReactModule as unknown as { default?: ReactModuleShape }).default ?? ReactModule;

  // biome-ignore lint/suspicious/noExplicitAny: required to use RN string element types
  const h = React.createElement as (...args: any[]) => unknown;

  return {
    GlassView: ({ children }: { children?: unknown }) => h('View', null, children),
    isLiquidGlassAvailable: () => false,
    isGlassEffectAPIAvailable: () => false,
  };
});

// Mock expo-image — ships TypeScript source; provide a minimal shim.
// A component function rather than `Object.assign('Image', …)`: assigning onto a string
// primitive boxes it into a String object, which React rejects as an element type. Every
// component rendering an Image had been mocked out until now, so it never surfaced.
vi.mock('expo-image', async () => {
  const ReactModule = await import('react');
  type ReactModuleShape = typeof import('react');
  const React = (ReactModule as unknown as { default?: ReactModuleShape }).default ?? ReactModule;

  return {
    Image: Object.assign((props: Record<string, unknown>) => React.createElement('Image', props), {
      prefetch: vi.fn(() => Promise.resolve(true)),
    }),
  };
});
