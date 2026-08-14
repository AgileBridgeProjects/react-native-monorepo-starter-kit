import { hapticMedium } from '@lib/utils/haptics';
import { cva } from 'class-variance-authority';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import type { ColorValue, OpaqueColorValue } from 'react-native';
import { Pressable, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { animationConfig } from '@/constants/animations';
import { iconSize, palette, shadows } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import { Icon } from './icon';
import type { IconSymbolName } from './icon-symbol';
import { Typography } from './typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The selection tint animates *in place* — an opacity "bleed" — rather than
 * sliding a shape across the card. A travelling fill reads as flashy, and
 * switching cards plays two of them at once (one draining, one filling), which
 * overwhelmed the picker. Fading the tint where it sits keeps a rapid
 * card-to-card switch calm; nothing moves across the screen to track.
 *
 * Timing is deliberately asymmetric: selecting fades in gently, deselecting
 * drops out quickly and quietly. So when you move from one card to the next only
 * the incoming card animates prominently — the outgoing one just clears.
 */
const SELECT_IN_DURATION = 360;
const SELECT_OUT_DURATION = 140;
/** Gentle ease-out so the tint eases in and settles rather than stepping in. */
const SELECT_EASING = animationConfig.easing.decelerate;
/**
 * The tint is a flat translucent cyan wash — an "opacity cyan" — over the card's
 * own dark surface, fading in place (no travel). Solid rather than a gradient so
 * it's spread perfectly evenly with nothing weighting a side or corner, and it
 * leans on the card's existing background for depth rather than painting a
 * second colour. It fades in on opacity while scaling up a touch (a subtle soak)
 * and rests below full opacity so the selected state is a calm cyan tint, not a
 * saturated block. Raise `FILL_MAX_OPACITY` toward 1 for a more solid cyan,
 * lower it to let more of the dark card show through. The colour itself is the
 * `bg-accent` className on the fill view below (accent-500 in both themes),
 * not a constant here — only the animation tuning needs to live in JS.
 */
const FILL_MAX_OPACITY = 0.7;
const FILL_SETTLE_SCALE = 0.96;

/**
 * Pearl icon-badge gradient — a soft white → pale-cyan sheen (rather than
 * flat white) so the badge reads as a lit pearl, not a plain circle.
 */
const PEARL_BADGE_GRADIENT = {
  colors: [palette.neutral[0], palette.accent[50]] as readonly [ColorValue, ColorValue],
  start: { x: 0, y: 0 } as const,
  end: { x: 1, y: 1 } as const,
};

// ─── Variants ────────────────────────────────────────────────────────────────

// `flex-1` fills whatever cell its parent gives it (row height, column width)
// so the card grows/shrinks with the screen — this assumes a plain flexbox
// grid parent (see check-in-emotion-screen.tsx), NOT a FlatList/ResponsiveGrid
// row: FlatList's virtualization collapses a `flex-1` item to `flexBasis: 0`
// (zero height) during re-renders on native, which is exactly why
// ResponsiveGrid uses a fixed `min-h` floor instead. If a future consumer
// needs to place this inside a FlatList again, don't reuse `flex-1` as-is —
// bring back the min-height approach for that call site.
// `min-h-[136px]` is a floor, not the target size: it stops a card from
// shrinking below "badge + one-line label" content height on a very small or
// cramped screen, while still growing to fill available space everywhere else.
//
// Surface treatment — dark navy panel + cyan glow,
// built entirely from shared tokens (`bg-brand-blue-card-dark` already backs
// the the identity split dark auth card; `shadows.glow` lives in constants/tokens.ts).
// This is the single swap point if the surface ever moves to Apple's Liquid
// Glass material (iOS 26+, e.g. `expo-glass-effect`) instead of a flat
// dark card — change `bg-brand-blue-card-dark` and `shadows.glow` here (and
// in constants/tokens.ts) and every consumer of `IconSelectCard` picks it up
// unchanged, with no per-screen edits.
// Constant `border-2 border-accent` in both states — selecting no longer changes
// the border (the earlier border-width "tick" on selection was removed). The
// cyan wash is the sole selected-state signal now.
const iconSelectCardVariants = cva(
  'flex-1 min-h-[136px] items-center justify-center gap-sm rounded-2xl border-2 border-accent bg-brand-blue-card-dark px-sm py-md',
);

// ─── Props ───────────────────────────────────────────────────────────────────

export interface IconSelectCardProps {
  /** Icon shown inside the circular badge. */
  icon: IconSymbolName;
  /** Icon colour — pass a resolved value from `constants/tokens`, not a className. */
  iconColor: string | OpaqueColorValue;
  label: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A single-select card: a coloured icon in a circular badge over a label.
 * Generic building block for icon+label choice grids (emotion picker, etc.) —
 * not tied to any one feature's domain data.
 */
export function IconSelectCard({
  icon,
  iconColor,
  label,
  selected = false,
  onPress,
  testID,
}: IconSelectCardProps) {
  // A single 0→1 progress value drives the tint's opacity and settle-scale
  // together. Deselect uses a shorter duration than select (see the constants)
  // so switching cards stays calm.
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, {
      duration: selected ? SELECT_IN_DURATION : SELECT_OUT_DURATION,
      easing: SELECT_EASING,
    });
  }, [selected, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    // Bleed in place: fade opacity in and scale up a touch (soak outward). No
    // translation — nothing sweeps across the card.
    opacity: interpolate(progress.value, [0, 1], [0, FILL_MAX_OPACITY]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [FILL_SETTLE_SCALE, 1]) }],
  }));

  const handlePress = () => {
    hapticMedium();
    onPress();
  };

  return (
    <AnimatedPressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={handlePress}
      testID={testID}
      className={cn(iconSelectCardVariants())}
      // Ambient glow has no Tailwind/NativeWind equivalent on native (RN shadow
      // props aren't expressible as classes) — see the surface-treatment note
      // above. No animated transform on the card itself: an earlier scale/lift
      // added to the "flashy" feel when switching cards, so selection is now
      // signalled solely by the cyan tint fading in.
      style={shadows.glow}
    >
      {/* Cyan tint on selection, clipped to the card's rounded shape by this
          wrapper — not the Pressable itself, which needs `overflow: 'visible'`
          to cast its own shadow above. Same split-view pattern as the badge glow
          below.
          `rounded-xl` (not the card's `rounded-2xl`), because `inset-0` sits
          inside the border box: with the constant `border-2`, the inner corner
          radius is the card's 16px minus the 2px border ≈ 14px, and `rounded-xl`
          (12px) stays safely inside that so the tint never overruns the border. */}
      <View className="absolute inset-0 overflow-hidden rounded-xl">
        {/* Card-sized cyan wash that fades in place (no travel), spread evenly
            over the whole card. `FILL_MAX_OPACITY` keeps it translucent so it
            reads as a cyan tint on the dark card, not an opaque block. Colour
            is the static `bg-accent` className; only opacity/scale animate. */}
        <Animated.View className="absolute inset-0 bg-accent" style={fillStyle} />
      </View>
      {/* Shadow lives on this outer, non-clipping View — not on the gradient
          below. `LinearGradient` must clip its own fill to the rounded shape
          (`overflow: 'hidden'`) to look like a circle rather than a square with
          rounded corners painted on top, and a view that clips its own content
          also clips its own shadow to nothing. Splitting the two is the
          standard RN fix: the glow renders on the unclipped outer box, the
          gradient fill clips on the inner one. */}
      <View className="h-14 w-14 rounded-full" style={shadows.badgeGlow}>
        <LinearGradient
          {...PEARL_BADGE_GRADIENT}
          // Explicit style, not className, for size/shape/centering: we already
          // confirmed on-device that className-only sizing doesn't reliably
          // apply to `LinearGradient` on native (see GradientBackground's
          // `style={{ flex: 1 }}` fix).
          style={{
            flex: 1,
            borderRadius: 28,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={iconSize.md} color={iconColor} />
        </LinearGradient>
      </View>
      {/* min-height (not a fixed height) reserves 2 lines' worth of space so
          most cards line up evenly, without capping/truncating a label that
          genuinely needs more room — the whole word must always be visible. */}
      <View className="min-h-10 justify-center">
        <Typography variant="label" className="text-center text-white">
          {label}
        </Typography>
      </View>
    </AnimatedPressable>
  );
}
