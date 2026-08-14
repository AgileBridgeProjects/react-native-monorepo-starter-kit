/**
 * Design Tokens — Expo app
 *
 * Re-exports shared primitive tokens from @starterkit/shared and extends them
 * with Expo-specific runtime values (semantic light/dark colors, shadows).
 *
 * CSS-level tokens live in global.css (@theme / @layer theme) and import
 * their raw values from @starterkit/shared/tokens.css.
 */

export {
  authControlHeight,
  borderRadius,
  fontSize,
  fontWeight,
  iconSize,
  lineHeight,
  palette,
  spacing,
  zIndex,
} from '@starterkit/shared';

import { palette } from '@starterkit/shared';

// ─── Semantic Colors (Light / Dark) ──────────────────────────────────────────
// Used by React Navigation, Reanimated, and platform-specific code.
// The web app uses CSS media queries for the same adaptive values.

export const colors = {
  light: {
    text: palette.neutral[900],
    textSecondary: palette.neutral[600],
    textMuted: palette.neutral[400],
    background: palette.neutral[0],
    surface: palette.neutral[50],
    surfaceElevated: palette.neutral[0],
    border: palette.neutral[200],
    borderStrong: palette.neutral[300],
    primary: palette.primary[500],
    primaryForeground: palette.neutral[0],
    accent: palette.accent[500],
    accentLight: palette.accent[50],
    gradientStart: palette.gradient.start,
    gradientMid: palette.gradient.mid,
    gradientEnd: palette.gradient.end,
    icon: palette.neutral[500],
    iconActive: palette.primary[500],
    iconInactive: palette.neutral[400],
    tabBar: palette.neutral[0],
    tabBarBorder: palette.neutral[200],
    success: palette.status.success,
    warning: palette.status.warning,
    error: palette.status.error,
  },
  dark: {
    text: palette.neutral[50],
    textSecondary: palette.neutral[400],
    textMuted: palette.neutral[600],
    background: palette.neutral[950],
    surface: palette.neutral[900],
    surfaceElevated: palette.neutral[800],
    border: palette.neutral[800],
    borderStrong: palette.neutral[700],
    primary: palette.primary[400],
    primaryForeground: palette.neutral[0],
    accent: palette.accent[400],
    accentLight: palette.accent[700],
    gradientStart: palette.gradient.start,
    gradientMid: palette.gradient.mid,
    gradientEnd: palette.gradient.end,
    icon: palette.neutral[500],
    iconActive: palette.primary[400],
    iconInactive: palette.neutral[600],
    tabBar: palette.neutral[900],
    tabBarBorder: palette.neutral[800],
    success: palette.status.success,
    warning: palette.status.warning,
    error: palette.status.error,
  },
} as const;

// ─── Shadows (iOS + Android) — platform-specific ────────────────────────────
// React Native shadow props — not expressible as CSS variables.

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  /**
   * Cyan ambient glow — an all-around tinted shadow
   * rather than a directional drop shadow, so `shadowOffset` stays at zero.
   */
  glow: {
    shadowColor: palette.accent[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  /**
   * Soft cyan halo radiating from the pearl icon badge (the identity split check-in
   * cards) — a gentle glow around the ~56px badge. Kept subtle (was a much more
   * vivid 0.9/20) so the badge reads as softly lit rather than shouting.
   */
  badgeGlow: {
    shadowColor: palette.accent[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ─── Overlay ─────────────────────────────────────────────────────────────────

export const overlay = {
  backdrop: 'rgba(0,0,0,0.5)',
} as const;

// ─── Motion ──────────────────────────────────────────────────────────────────

/**
 * Shared Reanimated spring presets, so interactive feedback feels like one
 * app instead of per-component physics.
 *
 * `snap` is just past critical damping at low mass (ratio ≈1.05): a decisive
 * settle with no visible oscillation, sized for press feedback and value
 * commits on large surfaces where an underdamped spring reads as wobble.
 */
export const springs = {
  snap: { damping: 20, stiffness: 300, mass: 0.3 },
} as const;

// ─── Touch target ────────────────────────────────────────────────────────────

/**
 * WCAG 2.1 AA minimum tappable size in px — the JS twin of the `touch-target`
 * utility in global.css (`min-h-[44px] min-w-[44px]`).
 *
 * Exported so layout maths that has to agree with that utility reads from one place.
 * Reach for the CSS class in markup; use this only where the number is needed in JS
 * (measuring a bar's height, positioning an anchored menu).
 */
export const touchTarget = 44;
