import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '@/constants/tokens';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/**
 * Linear, not a spring. A spring decelerates into its target, which on a small-percentage-per-step
 * bar reads as the fill crawling the last few pixels. Constant velocity moves and stops.
 */
const FILL_DURATION = 300;

/**
 * Track widths spanned by the gradient layer. Two is the minimum that keeps the track covered
 * at both ends of the travel; a third buys nothing and costs a wider gradient to paint.
 */
const TILE_COUNT = 2;

/** Time to travel exactly one tile width. Slow enough to read as a drift, not a scroll. */
const DRIFT_DURATION = 3200;

export interface AnimatedProgressBarProps {
  /** Progress as a percentage (0–100). */
  value: number;
  /**
   * Drifting ramp colours, laid across a layer two track widths wide and repeated once so the
   * loop is seamless — every colour at index 0 must equal the colour at the last index. Defaults
   * to a cyan→pale→cyan accent ramp.
   */
  colors?: readonly [string, string, ...string[]];
  /** Gradient stop positions matching `colors` (0–1). Defaults to an evenly-spaced 5-stop ramp. */
  locations?: readonly [number, number, ...number[]];
  /** Track height in px. */
  height?: number;
  testID?: string;
}

const DEFAULT_COLORS = [
  palette.accent[500],
  palette.accent[50],
  palette.accent[500],
  palette.accent[50],
  palette.accent[500],
] as const;
const DEFAULT_LOCATIONS = [0, 0.25, 0.5, 0.75, 1] as const;
const DEFAULT_HEIGHT = 24;

/**
 * A thick progress pill with a cyan→pale linear gradient drifting left to right at constant
 * velocity — the only motion here: no pulse, no flash, no ripple on advance. Because the ramp is
 * tiled and travels exactly one tile per cycle, the loop is seamless — there's no visible restart.
 * Under `useReducedMotion` the drift is dropped and the same gradient renders static.
 *
 * For the common thin/spring-fill progress bar (no drift, single flat colour), use `ProgressBar`
 * instead — this component is for the heavier, more expressive treatment.
 */
export function AnimatedProgressBar({
  value,
  colors = DEFAULT_COLORS,
  locations = DEFAULT_LOCATIONS,
  height = DEFAULT_HEIGHT,
  testID,
}: AnimatedProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const reducedMotion = useReducedMotion();

  const progress = useSharedValue(clamped);
  const drift = useSharedValue(0);

  // The drift translates by a pixel amount, so it can't start until the track has been measured.
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    progress.value = withTiming(clamped, {
      duration: FILL_DURATION,
      easing: Easing.linear,
    });
  }, [clamped, progress]);

  useEffect(() => {
    if (reducedMotion || trackWidth === 0) {
      cancelAnimation(drift);
      drift.value = 0;
      return;
    }

    drift.value = 0;
    drift.value = withRepeat(
      withTiming(1, { duration: DRIFT_DURATION, easing: Easing.linear }),
      -1,
      false,
    );

    return () => cancelAnimation(drift);
  }, [drift, reducedMotion, trackWidth]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));
  // Travels from one tile-width left of the origin back to it, so the ramp always enters from
  // the left instead of dragging an uncovered gap in behind it.
  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (drift.value - 1) * trackWidth }],
  }));

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
      // Translucent white rather than an opaque grey: the unearned remainder must stay quieter
      // than the fill already earned, or the bar leads with how far there is left to go.
      className="w-full overflow-hidden rounded-full bg-white/20"
      style={{ height }}
    >
      {/* The fill clips its own rounded cap — the tiled gradient inside is square-cut and wider
          than the fill, so the pill shape has to come from this wrapper. */}
      <Animated.View className="h-full overflow-hidden rounded-full" style={fillStyle}>
        {/* Sized against the whole track, not the filled portion, so the drift runs at one
            constant speed instead of accelerating as the bar fills. */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: Math.max(trackWidth, 1) * TILE_COUNT,
            },
            driftStyle,
          ]}
        >
          <LinearGradient
            colors={[...colors]}
            locations={[...locations]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            // Explicit style, not className: `LinearGradient` doesn't reliably take className
            // sizing on native (see IconSelectCard).
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
