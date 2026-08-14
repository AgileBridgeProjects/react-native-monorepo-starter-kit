import { hapticSuccess } from '@lib/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { AccessibilityInfo, Modal, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TapHint } from '@/components/ui/tap-hint';
import { Typography } from '@/components/ui/typography';
import { palette } from '@/constants/tokens';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/** Beat the finish moment gets to read before the bloom consumes it. */
const HOLD_MS = 550;
const BLOOM_MS = 900;
/**
 * How long the bloom takes to reach full opacity. Shorter than the growth so the colour has
 * arrived by the time the circle is large, rather than the two finishing together.
 *
 * Without this the bloom's first frame was a small, fully opaque disc sitting still for the
 * whole hold, which read as a stray dot rather than the start of anything.
 */
const FADE_MS = 320;
/** The 'settle' arrival: how long the gradient takes to fade in over the caller's flood. */
const SETTLE_FADE_MS = 450;

/**
 * The completion surface every overlay settles into — the app's teal-to-navy
 * accent. Exported so completion chrome that cannot use this component
 * directly (the breathing overlay, which adds auto-advance and a close
 * control) still lands on the identical surface.
 */
export const BLOOM_OVERLAY_GRADIENT: [string, string] = [palette.accent[700], palette.primary[700]];

export interface BloomOverlayProps {
  /**
   * The size (px) of whatever the bloom visually grows from — the orb on the
   * Skills timer, a check-in badge, an onboarding icon — so the bloom starts
   * at that scale rather than snapping in at full-screen size.
   */
  anchorSize: number;
  heading: string;
  tapHintLabel: string;
  /** Deliberate tap-to-continue — the same action Next/Finish would have taken. */
  onPress: () => void;
  testID?: string;
  /** Gradient the bloom cools into. Defaults to the app's teal-to-navy accent. */
  colors?: [string, string];
  /**
   * Beat to hold before the bloom starts growing. Defaults to the Skills timer's pause, which
   * exists so the finished orb reads for a moment first. Screens with nothing to hold on (the
   * survey runner, whose Finish button is already gone) pass `0` and bloom straight away.
   *
   * Ignored when `arrival` is `'settle'` — the caller's own visual already carried the climax.
   */
  holdMs?: number;
  /**
   * How the overlay arrives. 'bloom' (default) holds a beat, then grows a
   * circle from `anchorSize` to full screen — the original shared behaviour.
   * 'settle' assumes the CALLER's own visual already floods the screen (the
   * Skills timer's detonated orb): the gradient just fades in over it, the
   * text lands sooner, and the success haptic is the caller's to fire at its
   * own climactic moment — this overlay stays silent.
   */
  arrival?: 'bloom' | 'settle';
}

/**
 * A completion moment: rather than auto-advancing, a bloom grows
 * outward from where the anchoring visual sits until it floods the whole
 * screen — safe areas included, hence `Modal` rather than an in-layout
 * overlay — then the heading and tap hint settle over it. Advancing stays a
 * deliberate tap; nothing here fires on its own.
 *
 * Shared because the same "hold the finish moment, then bloom" beat is
 * useful anywhere a flow completes with a deliberate tap-to-continue — the
 * Skills timer today, check-in/onboarding completion elsewhere. Callers whose
 * own visual performs the flood (the timer's exploding orb) use
 * `arrival="settle"` instead — see that prop.
 */
export function BloomOverlay({
  anchorSize,
  heading,
  tapHintLabel,
  onPress,
  testID,
  colors = BLOOM_OVERLAY_GRADIENT,
  holdMs = HOLD_MS,
  arrival = 'bloom',
}: BloomOverlayProps) {
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const settles = arrival === 'settle';
  const textDelayMs = holdMs + BLOOM_MS;

  // A circle whose radius reaches the screen's farthest corner from centre
  // covers the whole rectangle, safe areas included — the 1.05 margin absorbs
  // rounding at the edge.
  const diagonal = Math.hypot(width, height) * 1.05;
  const initialScale = anchorSize / diagonal;

  const bloom = useSharedValue(settles || reducedMotion ? 1 : initialScale);
  const bloomOpacity = useSharedValue(settles || reducedMotion ? 1 : 0);
  const fade = useSharedValue(settles && !reducedMotion ? 0 : 1);
  const textDelay = settles ? SETTLE_FADE_MS : textDelayMs;

  // Runs once on mount — the completion moment happens exactly once per visit.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally mount-only
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${heading}. ${tapHintLabel}`);
    if (settles) {
      // The caller's own flood already carried the climax (and its haptic) —
      // this surface just fades in over it and lets the text land.
      fade.value = withTiming(1, { duration: reducedMotion ? 0 : SETTLE_FADE_MS });
      return () => cancelAnimation(fade);
    }
    // The celebratory pulse lands with the text, not the instant completion
    // fired — otherwise the haptic fires a full beat ahead of anything visible.
    const successTimer = setTimeout(hapticSuccess, reducedMotion ? 0 : textDelayMs);
    if (reducedMotion) return () => clearTimeout(successTimer);
    bloom.value = withDelay(
      holdMs,
      withTiming(1, {
        duration: BLOOM_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
    // Fades up alongside the growth rather than being visible from frame one, so the bloom
    // arrives as colour spreading outward instead of a hard disc that then expands.
    bloomOpacity.value = withDelay(holdMs, withTiming(1, { duration: FADE_MS }));
    return () => {
      clearTimeout(successTimer);
      cancelAnimation(bloom);
      cancelAnimation(bloomOpacity);
    };
  }, []);

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: settles ? fade.value : bloomOpacity.value,
    transform: [{ scale: bloom.value }],
  }));

  return (
    <Modal
      transparent
      animationType="none"
      statusBarTranslucent
      visible
      // Android requires a handler; a hardware back press is the same
      // deliberate "move on" gesture as tapping the overlay.
      onRequestClose={onPress}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={tapHintLabel}
        className="flex-1 items-center justify-center overflow-hidden"
        testID={testID}
      >
        <AnimatedGradient
          pointerEvents="none"
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            bloomStyle,
            {
              position: 'absolute',
              width: diagonal,
              height: diagonal,
              borderRadius: diagonal / 2,
            },
          ]}
        />
        <Animated.View
          entering={FadeIn.delay(reducedMotion ? 0 : textDelay).duration(400)}
          className="items-center gap-md px-xl"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <Typography variant="h1" className="text-center uppercase text-white">
            {heading}
          </Typography>
          <TapHint label={tapHintLabel} />
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
