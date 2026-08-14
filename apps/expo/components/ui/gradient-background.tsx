import type { ReactNode } from 'react';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';

import { palette } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import { useHeaderClearance } from '@/src/lib/hooks/use-header-clearance';

/**
 * The StarterKit "Dark background" (Figma) navy → teal → navy stops, rendered as a
 * **diagonal** sweep along the top-right → bottom-left axis.
 *
 * Still the source of truth for the auth surfaces (sign-in hero, splash /
 * landing, OAuth overlay), which spread it onto their own
 * `expo-linear-gradient`. In-app screens no longer use it — see
 * {@link GradientBackground}.
 */
export const SCREEN_GRADIENT = {
  colors: [palette.gradient.start, palette.gradient.mid, palette.gradient.end] as readonly [
    ColorValue,
    ColorValue,
    ColorValue,
  ],
  // Figma "Dark background" stop percentages (12.171% / 64.004% / 98.874%).
  locations: [0.12171, 0.64004, 0.98874] as const,
  // Diagonal: top-right → bottom-left (cyan band toward the top-left).
  start: { x: 1, y: 0 } as const,
  end: { x: 0, y: 1 } as const,
};

interface GradientBackgroundProps {
  /** Content rendered on top of the gradient. */
  children?: ReactNode;
  /** Extra classes. Merged with the default `flex-1` so the gradient fills its parent. */
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /**
   * Adds top clearance for the given transparent, floating header variant
   * (see {@link useHeaderClearance}). Omit on routes with no native header
   * (e.g. `headerShown: false`) or on web, where headers are space-reserving
   * flex siblings and need no extra clearance.
   */
  headerClearance?: 'tab' | 'detail' | 'none';
  /**
   * Mirrors `headerClearance` as bottom padding too. Needed for screens whose
   * content is vertically centered — asymmetric (top-only) padding shifts
   * `justify-content: 'center'` away from the screen's true visual center.
   */
  symmetricClearance?: boolean;
}

/**
 * Full-bleed in-app screen backdrop. Historically the diagonal brand gradient;
 * now a solid deep navy (`bg-brand-blue-screen` design pass) — only the
 * auth surfaces keep the gradient, via {@link SCREEN_GRADIENT} directly.
 * Fills its parent (`flex-1`) by default; the component name is kept so the
 * many existing call sites stay untouched.
 */
export function GradientBackground({
  children,
  className,
  style,
  testID,
  headerClearance,
  symmetricClearance,
}: GradientBackgroundProps) {
  const clearance = useHeaderClearance(headerClearance ?? 'tab');
  const clearanceStyle = headerClearance
    ? { paddingTop: clearance, ...(symmetricClearance && { paddingBottom: clearance }) }
    : undefined;

  return (
    <View
      testID={testID}
      className={cn('flex-1 bg-brand-blue-screen', className)}
      // `className="flex-1"` alone doesn't reliably fill the screen on iOS for a
      // full-bleed root background (confirmed on-device — it shrink-wraps to
      // content height instead, leaving the rest of the screen showing the Stack's
      // white `contentStyle`), so pair it with an explicit `style={{ flex: 1 }}`.
      style={headerClearance ? [{ flex: 1 }, clearanceStyle, style] : [{ flex: 1 }, style]}
    >
      {children}
    </View>
  );
}

export type { GradientBackgroundProps };
