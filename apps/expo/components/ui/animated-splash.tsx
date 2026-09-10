import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import brandWordmark from '@/assets/images/brand-wordmark.png';
import brandKnockout from '@/assets/images/brand-wordmark-knockout.png';
import { palette } from '@/constants/tokens';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// ─── Geometry ─────────────────────────────────────────────────────────────────

/**
 * Must stay in lockstep with `expo-splash-screen`'s `imageWidth` in app.json.
 * The native splash and this component draw the same asset at the same width on
 * the same background, which is the entire reason the handoff between them is
 * invisible — change one without the other and the logo visibly jumps.
 */
const WORDMARK_WIDTH = 260;

/** Intrinsic aspect ratio of brand-wordmark.png (1076 × 297). */
const WORDMARK_ASPECT_RATIO = 1076 / 297;
const WORDMARK_HEIGHT = WORDMARK_WIDTH / WORDMARK_ASPECT_RATIO;

// ─── Motion ───────────────────────────────────────────────────────────────────

/** One full left→right rake of the highlight. */
const SWEEP_DURATION_MS = 1400;

/**
 * How long the pure-white wordmark lingers before settling into the dim ghost.
 * This is the handoff window: the native splash hands over a fully lit logo, so
 * frame 0 here must also be fully lit or the screen flashes dark.
 */
const HANDOFF_FADE_MS = 420;

/** Highlight band width, as a fraction of the wordmark box. */
const BAND_WIDTH_RATIO = 0.55;
const BAND_WIDTH = WORDMARK_WIDTH * BAND_WIDTH_RATIO;

/** Resting brightness of the un-swept wordmark. */
const GHOST_OPACITY = 0.24;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * Transparent → cyan → white core → cyan → transparent. Rendered on a diagonal
 * axis (bottom-left → top-right) so the highlight rakes across the glyphs
 * rather than wiping straight down them.
 */
const BAND_COLORS = [
  `${palette.accent[500]}00`,
  `${palette.accent[500]}80`,
  palette.neutral[0],
  `${palette.accent[500]}80`,
  `${palette.accent[500]}00`,
] as const;

const BAND_LOCATIONS = [0, 0.34, 0.5, 0.66, 1] as const;

/** Cross-fade to the app underneath when the splash is dismissed. */
const EXIT_FADE_MS = 320;

// ─── Component ────────────────────────────────────────────────────────────────

interface AnimatedSplashProps {
  /**
   * Fires once this view has painted. The caller uses it to hide the native
   * splash at exactly that moment — hiding any earlier exposes an unpainted
   * screen, any later and the loop is never seen.
   */
  onLayout?: (event: LayoutChangeEvent) => void;
  testID?: string;
}

/**
 * The animated continuation of the native splash screen.
 *
 * iOS launch storyboards and Android splash themes draw a **static** bitmap —
 * no app can animate them directly. The universal workaround, and what this
 * component implements, is a handoff: the native splash paints the wordmark,
 * this view mounts rendering the same asset at the same size on the same navy,
 * and the animation starts from a state identical to what the native splash was
 * already showing. Nothing moves at the seam, so it reads as one continuous
 * animated splash.
 *
 * The sweep is built from a knockout plate rather than a mask, which needs no
 * masking library: `brand-wordmark-knockout.png` is solid navy with the glyphs
 * punched out of its alpha channel, so laying it over the travelling highlight
 * hides that highlight everywhere except inside the letters.
 *
 * Layer order (bottom → top):
 *   1. ghost     — dim wordmark, the resting state
 *   2. highlight — travelling gradient band
 *   3. knockout  — navy plate that confines the band to the glyph interiors
 *   4. handoff   — fully lit wordmark, fades out over {@link HANDOFF_FADE_MS}
 */
export function AnimatedSplash({ onLayout, testID }: AnimatedSplashProps) {
  const sweep = useSharedValue(0);
  const handoff = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    // Both ends of the travel park the band fully off the wordmark, so the
    // non-reversing repeat snaps back invisibly and the loop is seamless.
    sweep.value = withRepeat(
      withTiming(1, { duration: SWEEP_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    handoff.value = withTiming(0, { duration: HANDOFF_FADE_MS, easing: Easing.out(Easing.quad) });

    return () => {
      cancelAnimation(sweep);
      cancelAnimation(handoff);
    };
  }, [sweep, handoff, reducedMotion]);

  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -BAND_WIDTH + sweep.value * (WORDMARK_WIDTH + BAND_WIDTH) }],
  }));

  const handoffStyle = useAnimatedStyle(() => ({ opacity: handoff.value }));

  // Both branches are meaningful — the static handoff frame for reduced motion, the
  // full ghost/sweep/knockout/handoff stack otherwise — so the choice is made here
  // rather than inline in the JSX (docs/standards/frontend.md § Conditional rendering).
  const wordmark = reducedMotion ? (
    // No looping sweep: hold the lit wordmark the native splash handed over.
    <Image source={brandWordmark} style={StyleSheet.absoluteFill} contentFit="contain" />
  ) : (
    <>
      <Image
        source={brandWordmark}
        style={[StyleSheet.absoluteFill, styles.ghost]}
        tintColor={palette.accent[200]}
        contentFit="contain"
      />
      <AnimatedLinearGradient
        colors={BAND_COLORS}
        locations={BAND_LOCATIONS}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={[styles.band, bandStyle]}
      />
      <Image source={brandKnockout} style={StyleSheet.absoluteFill} contentFit="contain" />
      <Animated.View style={[StyleSheet.absoluteFill, handoffStyle]}>
        <Image source={brandWordmark} style={StyleSheet.absoluteFill} contentFit="contain" />
      </Animated.View>
    </>
  );

  return (
    <Animated.View
      testID={testID}
      onLayout={onLayout}
      exiting={FadeOut.duration(EXIT_FADE_MS)}
      // Transient and purely decorative — the same treatment Skeleton gives its
      // shimmer, so assistive tech is not told about a logo that is about to vanish.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // Deliberately NOT pointerEvents="none": the app is mounted and live behind
      // this overlay, so swallowing touches is what stops taps landing on UI the
      // user cannot see yet.
      style={[StyleSheet.absoluteFill, styles.backdrop]}
    >
      <View style={styles.box}>{wordmark}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: palette.blue.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: WORDMARK_WIDTH,
    height: WORDMARK_HEIGHT,
    // Confines the travelling band to the wordmark box.
    overflow: 'hidden',
  },
  ghost: {
    opacity: GHOST_OPACITY,
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: BAND_WIDTH,
  },
});

export type { AnimatedSplashProps };
