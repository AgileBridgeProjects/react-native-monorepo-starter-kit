import { hapticSelection } from '@lib/utils/haptics';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { palette, springs } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import { RATING_STOP_POSITIONS, RATING_VALUE_STOPS, TINT_INACTIVE } from './rating-tint';
import { Typography } from './typography';

/**
 * Fraction of the track that stays filled at the minimum value, so choosing
 * "1" reads as a deliberate low answer (handle + stub visible) instead of the
 * fill glitching toward empty.
 */
const BASE_FILL = 0.08;
/** Fill colour while no value is chosen — same quiet white as unfilled inputs. */
const UNSET_FILL = palette.blue.inputFill;

export interface RatingSliderProps {
  /** The question this rating answers — the step's headline. */
  prompt?: string;
  /** "2 of 5" position caption when the slider is one item of a rating list. */
  ordinalLabel?: string;
  /**
   * `screen` (default): the full-screen Skills step — self-centering, its own padding, the giant
   * readout. `inline`: embedded in a scrolling form that owns the prompt, padding and vertical
   * rhythm (the survey runner), so the slider brings only the readout and the track.
   */
  variant?: 'screen' | 'inline';
  /**
   * Spoken name for the adjustable when the caller renders the prompt itself (`inline`).
   * Falls back to `prompt`, so `screen` callers change nothing.
   */
  accessibilityLabel?: string;
  value: number | null;
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  onChange: (value: number) => void;
  /**
   * Shared 0–1 channel (or `TINT_INACTIVE`) the slider drives on the UI thread
   * so the OWNER can tint surfaces outside this component — the runner paints
   * the whole screen with it, headers and footers included.
   */
  tintProgress?: SharedValue<number>;
  testID?: string;
}

/**
 * The app's numeric rating control: a full-screen step whose entire body is one
 * thick slider (drag anywhere on the bar to fill it) with a grab handle riding
 * the fill edge, a giant live readout, a selection haptic on every step
 * crossed, and an ambient screen tint that slides red → amber → green with the
 * value. Every numeric rating in the Skill Library goes through this one
 * control, so ratings never fragment into stars/pills/bars.
 */
export function RatingSlider({
  prompt,
  ordinalLabel,
  variant = 'screen',
  accessibilityLabel,
  value,
  min,
  max,
  minLabel,
  maxLabel,
  onChange,
  tintProgress,
  testID,
}: RatingSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const steps = Math.max(0, max - min);
  const displayValue = value === null ? null : Math.min(max, Math.max(min, value));
  const progress = useSharedValue(
    steps === 0 || displayValue === null ? 0 : (displayValue - min) / steps,
  );
  /** Whether the bar is being touched — scales it up slightly while active. */
  const pressed = useSharedValue(0);
  /**
   * Mirrors the committed value inside the gesture worklet so a drag only emits
   * (and ticks the haptic) when it crosses into a new step. Seeded NaN so that
   * selecting the LOWEST value on a still-unset slider counts as a change.
   */
  const lastEmitted = useSharedValue(Number.NaN);

  const commit = (next: number) => {
    hapticSelection();
    onChange(next);
  };

  const setFromX = (x: number) => {
    'worklet';
    if (trackWidth <= 0 || steps === 0) return;
    const ratio = Math.min(1, Math.max(0, x / trackWidth));
    const step = Math.round(ratio * steps);
    progress.value = withSpring(step / steps, springs.snap);
    if (tintProgress) tintProgress.value = withSpring(step / steps, springs.snap);
    const next = Math.min(max, min + step);
    if (next !== lastEmitted.value) {
      lastEmitted.value = next;
      runOnJS(commit)(next);
    }
  };

  // `onBegin` fires on touch-down, so a plain tap on the bar sets the value
  // without needing any drag. The step is a single-focus screen (no enclosing
  // scroll), so the pan can claim the touch immediately.
  const pan = Gesture.Pan()
    .onBegin((event) => {
      'worklet';
      pressed.value = withSpring(1, springs.snap);
      setFromX(event.x);
    })
    .onUpdate((event) => setFromX(event.x))
    .onFinalize(() => {
      'worklet';
      pressed.value = withSpring(0, springs.snap);
    });

  // Sync the visuals when the value changes (drag commits included), and park
  // the shared tint on its inactive sentinel while no value is chosen.
  // `lastEmitted` is deliberately only RESET here (null value = new session):
  // during a drag the worklet owns it, and a JS-side write for an
  // already-superseded commit would rewind the dedupe and double-fire the
  // haptic for a step the athlete already crossed.
  const externalProgress = steps === 0 || displayValue === null ? 0 : (displayValue - min) / steps;
  useEffect(() => {
    if (value === null) lastEmitted.value = Number.NaN;
    progress.value = withSpring(externalProgress, springs.snap);
    if (tintProgress) {
      tintProgress.value =
        value === null ? TINT_INACTIVE : withSpring(externalProgress, springs.snap);
    }
  }, [value, externalProgress, lastEmitted, progress, tintProgress]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + pressed.value * 0.06 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    // A base stub keeps the fill (and its handle) visible at the minimum value.
    width: `${(BASE_FILL + (1 - BASE_FILL) * progress.value) * 100}%`,
    backgroundColor:
      value === null
        ? UNSET_FILL
        : interpolateColor(progress.value, RATING_STOP_POSITIONS, RATING_VALUE_STOPS),
  }));

  const adjustBy = (delta: number) => {
    // First adjustment on an unset slider lands on `min` in BOTH directions —
    // otherwise increment skips the minimum value entirely and a screen-reader
    // user can only ever reach it via decrement-from-unset.
    const next = displayValue === null ? min : Math.min(max, Math.max(min, displayValue + delta));
    if (next !== value) commit(next);
  };

  const isInline = variant === 'inline';

  return (
    <View className={cn(!isInline && 'flex-1')} testID={testID}>
      <View className={isInline ? 'gap-lg' : 'flex-1 justify-center gap-2xl px-lg'}>
        {(ordinalLabel || prompt) && (
          <View className="gap-xs">
            {ordinalLabel && (
              <Typography variant="label" className="text-center text-text-secondary">
                {ordinalLabel}
              </Typography>
            )}
            {prompt && (
              <Typography variant="h2" className="text-center uppercase text-white">
                {prompt}
              </Typography>
            )}
          </View>
        )}

        {/* Display text, not a heading: the step's title is the prompt above;
            announcing a live numeric readout as the page heading misleads
            assistive tech. Styled to the display face by class instead. */}
        <Typography
          variant="body"
          className={cn(
            'text-center font-heading tracking-wide text-white',
            isInline ? 'text-6xl' : 'text-8xl',
          )}
        >
          {displayValue === null ? '–' : `${displayValue}`}
        </Typography>

        <View className="gap-sm">
          <GestureDetector gesture={pan}>
            <Animated.View
              style={trackStyle}
              className="h-20 overflow-hidden rounded-3xl bg-white/10"
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={accessibilityLabel ?? prompt}
              accessibilityValue={
                value === null ? { min, max } : { min, max, now: displayValue ?? min }
              }
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'increment') adjustBy(1);
                if (event.nativeEvent.actionName === 'decrement') adjustBy(-1);
              }}
              onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
            >
              {/* The grab handle rides the fill's right edge — the affordance
                  that says "drag me", so the bar never reads as an input box. */}
              <Animated.View
                className="h-full flex-row items-center justify-end pr-2"
                style={fillStyle}
              >
                <View className="h-10 w-1.5 rounded-full bg-white/90" />
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          {(minLabel || maxLabel) && (
            <View className="flex-row justify-between gap-md">
              {minLabel && (
                <Typography variant="caption" className="flex-1 text-text-secondary">
                  {minLabel}
                </Typography>
              )}
              {maxLabel && (
                <Typography variant="caption" className="flex-1 text-right text-text-secondary">
                  {maxLabel}
                </Typography>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
