import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui';

import { AUTH_SIGN_IN_GRADIENT } from './auth-gradient-hero';

interface GradientCtaButtonProps {
  onPress: () => void;
  loading?: boolean;
  testID?: string;
  children: ReactNode;
}

/**
 * Full-width CTA button with the StarterKit primary gradient (cyan → navy),
 * matching Figma's "Sign In" button. For a flat single-colour CTA, use the
 * shared `Button` directly instead — this component exists specifically for
 * the two-stop gradient (OTP verify, setup-account); Sign-In and
 * Forgot Password render a solid fill, so they use `Button` directly too.
 *
 * The rounding and clipping live on the outer `View`, NOT the
 * `LinearGradient`: on native, `expo-linear-gradient` does not pick up
 * `border-radius` from a Uniwind className, so the gradient's corners stay
 * square. A first-party `View` honours `rounded-pill` on native, and
 * `overflow-hidden` clips the gradient it wraps to that rounded shape.
 */
export function GradientCtaButton({ onPress, loading, testID, children }: GradientCtaButtonProps) {
  return (
    <View className="rounded-pill overflow-hidden mb-md w-full self-stretch">
      <LinearGradient {...AUTH_SIGN_IN_GRADIENT}>
        <Button
          variant="primary"
          size="auth"
          fullWidth
          onPress={onPress}
          loading={loading}
          className="bg-transparent"
          textClassName="font-body-bold"
          testID={testID}
        >
          {children}
        </Button>
      </LinearGradient>
    </View>
  );
}
