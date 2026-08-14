import React from 'react';

export const Platform = {
  OS: 'ios',
  select: <T extends Record<string, unknown>>(value: T) =>
    (value.ios ?? value.default ?? null) as T[keyof T] | null,
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T) => styles,
  flatten: <T>(style: T) => style,
};

export const Dimensions = {
  get: () => ({ width: 375, height: 812 }),
};

export const Keyboard = {
  dismiss: () => {},
  addListener: () => ({ remove: () => {} }),
};

/**
 * Defers to a macrotask like the real thing, rather than running the callback
 * inline — code that schedules work here (post-auth navigation, see
 * navigate-to-app-root.ts) does so *because* the timing matters, and a
 * synchronous stub would let a test pass while the real app raced. Tests drain
 * the queue explicitly with `flushInteractions()` from the rtr harness.
 */
export const InteractionManager = {
  runAfterInteractions: (callback?: () => void) => {
    const handle = setTimeout(() => callback?.(), 0);
    // Only `cancel` is mirrored. The real return value is also a thenable, but
    // reproducing that here trips noThenProperty — and nothing awaits the handle,
    // since callers hand this a callback rather than chaining off it.
    return { cancel: () => clearTimeout(handle) };
  },
};

export const KeyboardAvoidingView = 'KeyboardAvoidingView';
export const TouchableWithoutFeedback = 'TouchableWithoutFeedback';
export const View = 'View';
export const Text = 'Text';
export const Pressable = 'Pressable';
export const TextInput = 'TextInput';
export const TouchableOpacity = 'TouchableOpacity';
export const ActivityIndicator = 'ActivityIndicator';
export const ScrollView = 'ScrollView';
export const Image = 'Image';
/**
 * A real class, not a factory arrow — callers do `new Animated.Value(…)`, which throws on an
 * arrow function.
 */
class AnimatedValue {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
  setValue(value: number) {
    this.value = value;
  }
  interpolate() {
    return this;
  }
}

/**
 * Animations jump straight to their target and resolve. Nothing asserts on animation timing,
 * only on the end-state UI, so a real driver would add no coverage and a lot of fake timers.
 */
const animateTo = (target: AnimatedValue, config?: { toValue?: number }) => ({
  start: (cb?: (result: { finished: boolean }) => void) => {
    if (typeof config?.toValue === 'number') target.setValue(config.toValue);
    cb?.({ finished: true });
  },
});

export const Animated = {
  View: 'Animated.View',
  Value: AnimatedValue,
  timing: animateTo,
  spring: animateTo,
};

export const useColorScheme = () => 'light' as const;

export const useWindowDimensions = () => ({ width: 375, height: 812, scale: 1, fontScale: 1 });

export const FlatList = (props: {
  data?: unknown[];
  renderItem?: (info: { item: unknown; index: number }) => unknown;
  ListHeaderComponent?: unknown;
  ListFooterComponent?: unknown;
  keyExtractor?: (item: unknown, index: number) => string;
  className?: string;
  contentContainerClassName?: string;
  contentInsetAdjustmentBehavior?: string;
}) => {
  const items = (props.data ?? []).map((item, index) => props.renderItem?.({ item, index }));
  return React.createElement(
    'View',
    null,
    props.ListHeaderComponent as React.ReactNode,
    ...(items as React.ReactNode[]),
    props.ListFooterComponent as React.ReactNode,
  );
};

export const SectionList = (props: {
  sections?: Array<{ data?: unknown[] }>;
  renderItem?: (info: { item: unknown; index: number; section: { data?: unknown[] } }) => unknown;
  renderSectionHeader?: (info: { section: { data?: unknown[] } }) => unknown;
  keyExtractor?: (item: unknown, index: number) => string;
  className?: string;
  contentContainerClassName?: string;
}) => {
  const sections = props.sections ?? [];
  return React.createElement(
    'View',
    null,
    ...sections.flatMap((section) => [
      props.renderSectionHeader?.({ section }) as React.ReactNode,
      ...((section.data ?? []).map((item, index) =>
        props.renderItem?.({ item, index, section }),
      ) as React.ReactNode[]),
    ]),
  );
};

export const Alert = {
  alert: (_title: string, _msg?: string, _buttons?: unknown[], _opts?: unknown) => {},
};

export const AccessibilityInfo = {
  announceForAccessibility: (_announcement: string) => {},
  isReduceMotionEnabled: () => Promise.resolve(false),
  isScreenReaderEnabled: () => Promise.resolve(false),
  addEventListener: (_event: string, _handler: (enabled: boolean) => void) => ({
    remove: () => {},
  }),
};

export const AppState = {
  currentState: 'active' as const,
  addEventListener: (_event: string, _handler: (state: string) => void) => ({
    remove: () => {},
  }),
};

export const BackHandler = {
  addEventListener: (_event: string, _handler: () => boolean) => ({
    remove: () => {},
  }),
};

export const Modal = ({
  children,
  visible,
}: {
  children: React.ReactNode;
  visible: boolean;
  transparent?: boolean;
  animationType?: string;
  onRequestClose?: () => void;
  statusBarTranslucent?: boolean;
}) => (visible ? (children as React.ReactElement) : null);

/**
 * Resolves rather than hitting the OS. Mutable methods (not arrow properties on a frozen object)
 * so tests can `vi.spyOn(Linking, 'openURL')` to assert what a link component tried to open.
 */
export const Linking = {
  openURL: (_url: string): Promise<boolean> => Promise.resolve(true),
  canOpenURL: (_url: string): Promise<boolean> => Promise.resolve(true),
  getInitialURL: (): Promise<string | null> => Promise.resolve(null),
  addEventListener: () => ({ remove: () => {} }),
};

export default {
  AccessibilityInfo,
  Alert,
  AppState,
  BackHandler,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  View,
  Text,
  Pressable,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Animated,
  useColorScheme,
  useWindowDimensions,
  FlatList,
  SectionList,
};
