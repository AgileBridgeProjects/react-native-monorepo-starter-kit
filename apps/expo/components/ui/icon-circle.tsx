import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { colors, iconSize, palette } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';

/**
 * Alpha applied to `color` for the `tint` variant, as an 8-bit hex suffix (`33` = 20%).
 *
 * Chosen so the glyph stays clear of the 3:1 non-text contrast floor against its own tint on
 * every hue in use. Pushing it higher makes the circle read more strongly against the screen but
 * costs the glyph that headroom, and the mid-luminance hues (pink, purple) run out first.
 */
const TINT_ALPHA = '33';

/** How far `color` is mixed toward white for the `pale` variant. */
const PALE_WHITE_MIX = 0.88;

/** Mixes a `#rrggbb` colour toward white by `amount` (0 = unchanged, 1 = white). */
function shade(hex: string, amount: number): string {
  const num = Number.parseInt(hex.replace('#', ''), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const r = mix((num >> 16) & 0xff);
  const g = mix((num >> 8) & 0xff);
  const b = mix(num & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Circle diameter, and the glyph size that sits inside it.
 *
 * Monotonic on purpose: stepping up a size must never shrink the glyph. The call sites this
 * replaced were not — `SkillRow` put a 28px glyph in a 32px circle (2px of margin, so it read as
 * a filled dot) while the 40px circles carried 20px. `sm` is now 16px, which costs that one badge
 * some heft and buys a scale a caller can reason about.
 */
const SIZES = {
  sm: { box: 'size-8', icon: iconSize.xs },
  md: { box: 'size-10', icon: iconSize.sm },
  lg: { box: 'size-16', icon: iconSize.lg },
} as const;

export type IconCircleVariant = 'tint' | 'pale' | 'neutral';
export type IconCircleSize = keyof typeof SIZES;

export interface IconCircleProps {
  /** SF Symbol name — must be mapped in `icon-symbol.tsx`. */
  name: string;
  /**
   * The hue this circle is built from. Required by `tint` and `pale`, ignored by `neutral`.
   *
   * Pass the raw colour, not a pre-tinted one: the variant decides how far to take it, which is
   * what stops each caller inventing its own alpha.
   */
  color?: string;
  /**
   * `tint` (default): circle is `color` at low alpha, glyph is `color` at full strength. Carries
   * a per-item hue, so it is the variant to reach for when the colour means something (a skill
   * category, an assignment type).
   *
   * `pale`: circle is a near-white wash of `color`, glyph is brand navy. Higher contrast on the
   * glyph, but the hue only survives as a hint, so it suits a surface with one fixed accent
   * rather than a set of types that must be told apart.
   *
   * `neutral`: circle is a flat white overlay, glyph is muted. For a mark that is decoration or
   * an empty-state placeholder rather than an identity.
   */
  variant?: IconCircleVariant;
  size?: IconCircleSize;
  /** Overrides the glyph colour the variant would pick. */
  iconColor?: string;
  className?: string;
  testID?: string;
}

/**
 * An icon inside a circle — the treatment used for list-row marks, empty-state placeholders and
 * completion badges across the app.
 *
 * One component with variants rather than the four near-identical hand-rolled copies this
 * replaced (`SkillRow`'s completed badge, `NotificationCard`'s type icon, the check-in reason
 * rows and the latest-emotion empty state). Those had drifted to three different alphas and two
 * different glyph-colour rules, so "match the other one" meant reading the other one first.
 */
export function IconCircle({
  name,
  color,
  variant = 'tint',
  size = 'md',
  iconColor,
  className,
  testID,
}: IconCircleProps) {
  const { box, icon } = SIZES[size];

  // `neutral` needs no runtime colour, so it stays a class and never reaches the style prop.
  const isNeutral = variant === 'neutral' || color === undefined;
  const backgroundColor = isNeutral
    ? undefined
    : variant === 'pale'
      ? shade(color, PALE_WHITE_MIX)
      : `${color}${TINT_ALPHA}`;

  const resolvedIconColor =
    iconColor ??
    (isNeutral ? colors.dark.textMuted : variant === 'pale' ? palette.blue.dark : color);

  return (
    <View
      className={cn(
        box,
        'items-center justify-center rounded-full',
        isNeutral && 'bg-white/10',
        className,
      )}
      // The tint is derived from a runtime colour, so it cannot be a Tailwind class.
      style={backgroundColor ? { backgroundColor } : undefined}
      testID={testID}
    >
      <Icon name={name} size={icon} color={resolvedIconColor} />
    </View>
  );
}
