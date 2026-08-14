import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { gradients } from '@starterkit/shared';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import { Image } from 'react-native';

import vybeWordmark from '@/assets/images/brand-wordmark.png';
import { SCREEN_GRADIENT } from '@/components/ui/gradient-background';
import { palette } from '@/constants/tokens';

// The Figma "Light background" gradient stops (cyan → navy) drive the primary
// button fill. Sourced from the shared token so no colour is hardcoded here.
const [[SIGN_IN_CYAN], [SIGN_IN_NAVY]] = gradients.lightBackground.stops;

export const AUTH_LOGO = vybeWordmark as number;

/** Accessibility label for the branded wordmark, shared across auth screens. */
export const AUTH_LOGO_A11Y_LABEL = 'StarterKit logo';

/** Accessibility label for the volleyball mesh hero image, shared across dark-card auth screens. */
export const AUTH_MESH_A11Y_LABEL = 'StarterKit volleyball';

/** NativeWind classes that size the white VYBE EQ wordmark consistently across all auth screens. */
export const AUTH_LOGO_CLASS = 'w-[220px] h-[61px]';

/** Shared gradient colors for the auth hero sections. */
export const AUTH_GRADIENT_COLORS: readonly [string, string, string] = [
  palette.gradient.start,
  palette.gradient.mid,
  palette.gradient.end,
];

/**
 * Hero/background gradient — now the shared diagonal {@link SCREEN_GRADIENT}
 * (top-right → bottom-left). Aliased here so existing auth imports keep working;
 * new screens should import `SCREEN_GRADIENT` / `GradientBackground` directly.
 */
export const AUTH_HERO_GRADIENT = SCREEN_GRADIENT;

/** Horizontal gradient (CTA buttons). */
export const AUTH_CTA_GRADIENT = {
  colors: AUTH_GRADIENT_COLORS as readonly [ColorValue, ColorValue, ColorValue],
  locations: [0, 0.5, 1] as const,
  start: { x: 0, y: 0 } as const,
  end: { x: 1, y: 0 } as const,
};

/**
 * Primary "Sign In" button gradient — deep navy → cyan, matching Figma's
 * `Primary Button` fill. Rendered as a full left→right sweep so both colours
 * read clearly across the button (an even two-stop spread, no pinned locations).
 */
export const AUTH_SIGN_IN_GRADIENT = {
  colors: [SIGN_IN_NAVY, SIGN_IN_CYAN] as readonly [ColorValue, ColorValue],
  start: { x: 0, y: 0 } as const,
  end: { x: 1, y: 0 } as const,
};

interface AuthGradientHeroProps {
  /** Optional children to render below the logo. */
  children?: ReactNode;
}

/**
 * Branded gradient hero with the white StarterKit logo, used by the login screen
 * and OAuth loading overlay.
 */
export function AuthGradientHero({ children }: AuthGradientHeroProps) {
  return (
    <LinearGradient
      {...AUTH_HERO_GRADIENT}
      testID={AUTH_TEST_IDS.components.gradientHero}
      className="flex-1 items-center justify-center pb-lg"
    >
      <Image
        source={AUTH_LOGO}
        className={AUTH_LOGO_CLASS}
        resizeMode="contain"
        accessible
        accessibilityLabel={AUTH_LOGO_A11Y_LABEL}
      />
      {children}
    </LinearGradient>
  );
}
