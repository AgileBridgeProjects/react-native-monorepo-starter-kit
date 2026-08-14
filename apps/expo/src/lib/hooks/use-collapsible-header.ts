import { useCallback, useRef } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/** Scroll-down distance (px) before the hero can collapse. */
const COLLAPSE_THRESHOLD = 80;

/**
 * Minimum upward scroll delta per event to trigger expand.
 * Larger magnitude = more deliberate upward swipe needed.
 */
const EXPAND_DELTA = -20;

/**
 * The list must be scrollable by at least this many px beyond the viewport
 * before the collapse behaviour activates.
 */
const MIN_SCROLLABLE_HEIGHT = 300;

const SNAP_MS = 200;
const SNAP_EASING = Easing.out(Easing.cubic);

/** Minimum time between collapse/expand toggles to prevent ping-pong. */
const COOLDOWN_MS = 400;

/**
 * Animates a hero section above a scrollable list.
 *
 * Everything is driven by a single `progress` shared value (0 → 1) on the
 * UI thread via Reanimated — **no React state changes at all**, so the list
 * never re-renders during animation (no image flash / jitter).
 *
 * - **heroContainerStyle** (animated): smoothly collapses the container height
 *   from the measured hero height down to 0.
 * - **heroAnimatedStyle** (animated): slides content up (`translateY`) and
 *   fades out (`opacity`) in sync with the container collapse.
 *
 * A cooldown timer prevents rapid ping-ponging when momentum scroll bounces
 * at the end of a list.
 *
 * The outer wrapper must be `<Animated.View style={heroContainerStyle}>`.
 *
 * @param existingOnScroll Optional scroll handler to compose with.
 */
export function useCollapsibleHeader(
  existingOnScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void,
) {
  const progress = useSharedValue(0); // 0 = expanded, 1 = collapsed
  const isCollapsedRef = useRef(false);
  const heroHeight = useSharedValue(0);
  const measured = useRef(false);
  const lastScrollY = useRef(0);
  const lastToggleTime = useRef(0);

  // Exported so callers can wire onScrollBeginDrag to their list — useful when
  // a screen wraps this value to do additional work (e.g. scoreboard's load-earlier guard).
  const onScrollBeginDrag = useCallback(() => {}, []);

  const onHeroLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!measured.current) {
        heroHeight.value = event.nativeEvent.layout.height;
        measured.current = true;
      }
    },
    [heroHeight],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      existingOnScroll?.(event);

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const y = contentOffset.y;
      const dy = y - lastScrollY.current;
      lastScrollY.current = y;

      const scrollable = contentSize.height - layoutMeasurement.height;

      // Cooldown prevents rapid toggle from momentum bounce at list edges.
      const now = Date.now();
      if (now - lastToggleTime.current < COOLDOWN_MS) return;

      // ── Collapse ──────────────────────────────────────────────
      // Only collapse when there's enough scrollable content.
      if (
        scrollable >= MIN_SCROLLABLE_HEIGHT &&
        y > COLLAPSE_THRESHOLD &&
        dy > 2 &&
        !isCollapsedRef.current
      ) {
        isCollapsedRef.current = true;
        lastToggleTime.current = now;
        progress.value = withTiming(1, { duration: SNAP_MS, easing: SNAP_EASING });
      }
      // ── Expand ────────────────────────────────────────────────
      // Always allow expand regardless of scrollable height (the hero
      // collapsing increases layoutMeasurement, which can shrink
      // scrollable below the threshold and trap the hero offscreen).
      else if (dy < EXPAND_DELTA && isCollapsedRef.current) {
        isCollapsedRef.current = false;
        lastToggleTime.current = now;
        progress.value = withTiming(0, { duration: SNAP_MS, easing: SNAP_EASING });
      }
    },
    [progress, existingOnScroll],
  );

  // Animated container: height collapses smoothly on the UI thread.
  const heroContainerStyle = useAnimatedStyle(() => {
    if (heroHeight.value === 0) return {};
    return {
      height: interpolate(progress.value, [0, 1], [heroHeight.value, 0]),
      overflow: 'hidden' as const,
    };
  });

  // Inner content: translateY + opacity for the visual slide-up / fade.
  const heroAnimatedStyle = useAnimatedStyle(() => {
    if (heroHeight.value === 0) return {};
    return {
      transform: [{ translateY: interpolate(progress.value, [0, 1], [0, -heroHeight.value]) }],
      opacity: interpolate(progress.value, [0, 1], [1, 0]),
    };
  });

  return {
    heroAnimatedStyle,
    heroContainerStyle,
    onHeroLayout,
    onScroll,
    onScrollBeginDrag,
    scrollEventThrottle: 16,
  } as const;
}
