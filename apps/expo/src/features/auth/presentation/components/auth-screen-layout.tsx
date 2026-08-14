import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardDismissView } from '@/components/ui';
import { animationConfig } from '@/constants/animations';
import { borderRadius, spacing } from '@/constants/tokens';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/src/lib/cn';

import { AUTH_TEST_IDS } from '../auth.copy';
import {
  AUTH_HERO_GRADIENT,
  AUTH_LOGO,
  AUTH_LOGO_A11Y_LABEL,
  AUTH_LOGO_CLASS,
} from './auth-gradient-hero';

interface AuthScreenLayoutProps {
  /** Form content rendered in the card (native) or right panel (web). */
  children: ReactNode;
  /** Optional content rendered above the form on web only (e.g. a recaptcha container). */
  webSlotBefore?: ReactNode;
  /**
   * Card background — `light` (default) is the white card used by every other
   * auth screen; `dark` is the navy card from the redesigned Sign-In screen
   *. Native/mobile-web only — the wide split-panel layout is unaffected.
   */
  cardVariant?: 'light' | 'dark';
  /** Optional image rendered below the logo in the hero (e.g. the Sign-In volleyball mesh). Native/mobile-web only. */
  heroImage?: ImageSourcePropType;
  /** Accessibility label for `heroImage`. */
  heroImageA11yLabel?: string;
  /**
   * Hero height as a fraction of screen height when the keyboard is closed
   * (native/mobile-web hero-image layout only). A larger value grows the hero
   * and shortens the form card below it — useful for screens with little
   * content (e.g. forgot-password) so the card isn't stretched full-height.
   * Defaults to {@link HERO_EXPANDED_RATIO}.
   */
  heroExpandedRatio?: number;
}

/** Tailwind `md` breakpoint — below this, web uses the native-style hero layout. */
const WEB_SPLIT_MIN_WIDTH = 768;

/**
 * Sign-In hero (logo + volleyball mesh) height as a fraction of screen height
 * when the keyboard is closed. A fixed *fraction* (resolved to px) rather than a
 * percentage class so it never re-computes against a shrinking window — that
 * recompute was what squished the logo and ball together when the keyboard rose.
 */
const HERO_EXPANDED_RATIO = 0.41;

/**
 * Collapsed hero height (px) while the keyboard is open — 0, so the card
 * grows to fill the *entire* screen rather than leaving a residual wordmark
 * bar the keyboard could still creep under. The wordmark + mesh both fade out
 * (see heroAnimatedStyle/meshAnimatedStyle) as this collapses.
 */
const HERO_COLLAPSED_HEIGHT = 0;

/** Keyboard show/hide → hero collapse animation duration (ms). */
const HERO_COLLAPSE_DURATION = 220;

/** Nudges the volleyball mesh up from its default vertical centering, so more
 * of it clears the card overlap and reads as visible rather than centred over
 * the lower (soon-to-be-covered) half of the hero. */
const MESH_VERTICAL_NUDGE = -32;

/** Form card slide-up entrance duration (ms) — slow enough to read as a deliberate
 * bottom-sheet reveal rather than a snap. */
const CARD_SLIDE_UP_DURATION = 450;
const CARD_SLIDE_UP_EASING = animationConfig.easing.decelerate;

/**
 * Shared layout for all auth screens (login, forgot-password, OTP, setup-account).
 *
 * - **Wide web (≥768px)**: split-panel (gradient hero left + scrollable white form right).
 * - **Native & mobile web (<768px)**: full-screen gradient with logo → SVG wave →
 *   white card with form. Mobile web mirrors native exactly rather than stacking
 *   the split panel into two equal halves (which made the hero eat half the screen
 *   and forced the form to scroll).
 */
export function AuthScreenLayout({
  children,
  webSlotBefore,
  cardVariant = 'light',
  heroImage,
  heroImageA11yLabel,
  heroExpandedRatio = HERO_EXPANDED_RATIO,
}: AuthScreenLayoutProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const insets = useSafeAreaInsets();

  // iOS-only: the Sign-In / Forgot-Password card (the only `heroImage` callers)
  // gets a native Liquid Glass background instead of the flat card colour used
  // everywhere else — Android keeps the existing flat card unchanged.
  const isIOSHeroCard = Platform.OS === 'ios' && !!heroImage;

  // Frozen at first render — `useWindowDimensions().height` shrinks on Android
  // when the keyboard opens under `adjustResize`, which would otherwise shift
  // the interpolation's expanded-height target mid-animation (the exact
  // "recompute against a shrinking window" bug this layout was built to avoid;
  // see the keyboard-collapse effect below).
  const [initialScreenHeight] = useState(() => screenHeight);

  // ── Keyboard-aware hero collapse (Sign-In / dark hero-image layout) ──────────
  // Instead of letting a screen-wide KeyboardAvoidingView shrink the whole
  // gradient (which squished the logo + mesh together), we keep the hero
  // decoupled and animate it down to a compact wordmark when the keyboard opens,
  // handing the freed vertical space to the form card below.
  const keyboardProgress = useSharedValue(0);

  useEffect(() => {
    if (isWeb) return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => {
      keyboardProgress.value = withTiming(1, { duration: HERO_COLLAPSE_DURATION });
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardProgress.value = withTiming(0, { duration: HERO_COLLAPSE_DURATION });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [isWeb, keyboardProgress]);

  const heroExpandedHeight = initialScreenHeight * heroExpandedRatio;
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    height: interpolate(
      keyboardProgress.value,
      [0, 1],
      [heroExpandedHeight, HERO_COLLAPSED_HEIGHT],
    ),
    opacity: interpolate(keyboardProgress.value, [0, 1], [1, 0]),
  }));
  const meshAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(keyboardProgress.value, [0, 1], [1, 0]),
    transform: [{ translateY: MESH_VERTICAL_NUDGE }],
  }));

  // ── Bottom-sheet-style entrance (form card slides up on mount) ──────────────
  // Starts fully below the visible area (a full screen height is always enough,
  // regardless of the card's own — possibly `flex-1` — height) and eases to rest.
  // A deliberately slow, smooth `withTiming` ease-out rather than a spring — a
  // spring's snap/settle read as too fast for a distance this large. A one-shot
  // decorative entrance, not a state change, so it's skipped under reduced motion.
  const reducedMotion = useReducedMotion();
  const cardTranslateY = useSharedValue(reducedMotion ? 0 : initialScreenHeight);

  useEffect(() => {
    if (reducedMotion) return;
    cardTranslateY.value = withTiming(0, {
      duration: CARD_SLIDE_UP_DURATION,
      easing: CARD_SLIDE_UP_EASING,
    });
  }, [reducedMotion, cardTranslateY]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslateY.value }],
  }));

  // ── Wide web: split-panel (gradient hero left + scrollable white form right) ──
  if (isWeb && screenWidth >= WEB_SPLIT_MIN_WIDTH) {
    return (
      <>
        {webSlotBefore}
        <View
          testID={AUTH_TEST_IDS.components.screenLayout}
          className="flex-1 flex-row min-h-screen"
        >
          {/* Left: gradient hero panel */}
          <LinearGradient
            {...AUTH_HERO_GRADIENT}
            locations={[0, 0.55, 1]}
            testID={AUTH_TEST_IDS.components.gradientHero}
            className="flex-1 items-center justify-center min-h-50"
          >
            <Image
              source={AUTH_LOGO}
              className={AUTH_LOGO_CLASS}
              resizeMode="contain"
              accessible
              accessibilityLabel={AUTH_LOGO_A11Y_LABEL}
            />
          </LinearGradient>

          {/* Right: form card */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="flex-grow justify-center"
            className="flex-1 bg-surface"
          >
            <View className="w-full max-w-auth-form self-center px-md py-2xl">{children}</View>
          </ScrollView>
        </View>
      </>
    );
  }

  // Wordmark — vertically centred in a flex-1 hero by default (light card,
  // which is short enough to size to its natural content height below). When a
  // hero image is present, the wordmark box gets an animated fixed height: a
  // proportion of the screen at rest, collapsing to a compact bar when the
  // keyboard opens so the card (flex-1) grows into the freed space and the CTA
  // stays reachable — instead of the whole hero squishing.
  const wordmark = heroImage ? (
    <Animated.View className="items-center justify-start pb-lg pt-2xl" style={heroAnimatedStyle}>
      <Image
        source={AUTH_LOGO}
        className={AUTH_LOGO_CLASS}
        resizeMode="contain"
        accessible
        accessibilityLabel={AUTH_LOGO_A11Y_LABEL}
      />
    </Animated.View>
  ) : (
    <View className="flex-1 items-center justify-center pb-lg">
      <Image
        source={AUTH_LOGO}
        className={AUTH_LOGO_CLASS}
        resizeMode="contain"
        accessible
        accessibilityLabel={AUTH_LOGO_A11Y_LABEL}
      />
    </View>
  );

  // Sign-In / Forgot-Password: fixed, non-scrolling content. Now that the hero
  // fully collapses (see HERO_COLLAPSED_HEIGHT) the card owns the whole screen
  // once the keyboard opens, so a local KeyboardAvoidingView (not the screen-wide
  // one this layout deliberately avoids — see the TouchableWithoutFeedback branch
  // below) is enough to keep the CTA clear of the keyboard on iOS; Android's
  // `adjustResize` window mode already handles this itself. Other auth screens
  // (light card, short hero, no heroImage) keep the plain scrollable ScrollView.
  const cardBody = heroImage ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
      style={{ paddingBottom: spacing.md + insets.bottom }}
    >
      {children}
    </KeyboardAvoidingView>
  ) : (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xl + insets.bottom }}
    >
      {children}
    </ScrollView>
  );

  // Rounded-top card (Figma "Sign In" frame) — light for most auth screens, dark for
  // the redesigned Sign-In screen. Slides up on mount, see cardAnimatedStyle above.
  //
  // iOS Sign-In/Forgot-Password gets a Liquid Glass background instead of the flat
  // card colour. Two earlier attempts at nesting the interactive form
  // *inside* a native glass container both broke on-device (a native BottomSheet's
  // fitToContents collapsed the form's height; GlassView itself ate touch events for
  // anything nested inside it, killing every button on the screen). This version
  // sidesteps both: GlassView renders as an absolutely-positioned, childless,
  // `pointerEvents="none"` background layer, and the actual form renders as a
  // completely separate plain-RN sibling on top of it — nothing is ever nested
  // inside GlassView, so there's nothing for it to break. Its KeyboardAvoidingView
  // carries its own `px-md pb-xl` padding (unlike cardBody's) since the glass
  // background paints edge-to-edge with none of its own.
  //
  // `style`, not `className`, on GlassView itself — confirmed on-device that this
  // native view does not pick up NativeWind/Uniwind's className transform the way
  // `LinearGradient` above does (switching it to className rendered no glass at all).
  const card = isIOSHeroCard ? (
    <Animated.View
      testID={AUTH_TEST_IDS.components.formCard}
      className="rounded-t-2xl flex-1 pt-xl"
      style={cardAnimatedStyle}
    >
      <GlassView
        glassEffectStyle="regular"
        colorScheme={cardVariant === 'dark' ? 'dark' : 'light'}
        pointerEvents="none"
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderTopLeftRadius: borderRadius['2xl'],
          borderTopRightRadius: borderRadius['2xl'],
        }}
      />
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1 px-md pb-xl"
        style={{ paddingBottom: spacing.md + insets.bottom }}
      >
        {children}
      </KeyboardAvoidingView>
    </Animated.View>
  ) : (
    <Animated.View
      testID={AUTH_TEST_IDS.components.formCard}
      className={cn(
        'rounded-t-2xl px-md pb-xl',
        cardVariant === 'dark' ? 'bg-brand-blue-card-dark' : 'bg-surface-elevated',
        heroImage ? 'flex-1 pt-xl' : 'pt-2xl',
      )}
      style={cardAnimatedStyle}
    >
      {cardBody}
    </Animated.View>
  );

  // ── Native & mobile web: gradient hero + flat rounded-top white card ────────
  // On web the gradient needs an explicit viewport height (min-h-screen) for the
  // flex-1 hero to fill the screen; on native the screen is already full-height.
  const heroLayout = (
    <LinearGradient
      {...AUTH_HERO_GRADIENT}
      testID={AUTH_TEST_IDS.components.gradientHero}
      style={{ flex: 1 }}
      className={isWeb ? 'min-h-screen' : undefined}
    >
      {/* Hero image — absolutely positioned over the FULL screen (independent of
          the wordmark's own layout) so it centres like the native boot splash and
          can be safely overlapped by the card below. Painted first, so the
          wordmark and card (rendered after, both opaque) sit on top of it. Fades
          out as the keyboard opens so a typing user gets a clean, focused form. */}
      {heroImage && (
        <Animated.View
          className="absolute inset-x-0 top-0 bottom-hero-mesh items-end justify-center"
          style={meshAnimatedStyle}
          pointerEvents="none"
        >
          <Image
            source={heroImage}
            className="size-hero-mesh"
            resizeMode="contain"
            accessible={!!heroImageA11yLabel}
            accessibilityLabel={heroImageA11yLabel}
          />
        </Animated.View>
      )}

      {wordmark}

      {card}
    </LinearGradient>
  );

  if (isWeb) {
    return (
      <>
        {webSlotBefore}
        {heroLayout}
      </>
    );
  }

  // Sign-In (hero-image) layout drives its own keyboard handling — an animated
  // hero collapse + iOS content insets — so it only needs tap-to-dismiss, not the
  // screen-wide KeyboardAvoidingView that was squishing the hero. Other auth
  // screens (light card, short hero) keep the shared KeyboardDismissView.
  if (heroImage) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {heroLayout}
      </TouchableWithoutFeedback>
    );
  }

  return <KeyboardDismissView>{heroLayout}</KeyboardDismissView>;
}
