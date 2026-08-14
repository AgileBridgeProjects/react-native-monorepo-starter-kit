import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/src/lib/cn';

// A translucent white wash rather than the neutral `bg-border` grey: every in-app
// screen sits on the deep navy (GradientBackground is that navy in BOTH schemes,
// the identity split), and a grey block on navy read as a foreign element rather than a
// placeholder for the content about to appear. White-alpha tints to whatever is
// behind it, so it works on the navy screen and on the lighter cards alike.
const skeletonVariants = cva('bg-white/10 overflow-hidden', {
  variants: {
    shape: {
      rectangle: 'rounded-md',
      card: 'rounded-3xl',
      circle: 'rounded-full',
    },
  },
  defaultVariants: {
    shape: 'rectangle',
  },
});

export interface SkeletonProps extends VariantProps<typeof skeletonVariants> {
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function Skeleton({ className, shape, style, testID }: SkeletonProps) {
  const translateX = useSharedValue(-1);
  const colorScheme = useColorScheme() ?? 'light';
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Skip the looping shimmer sweep — the static placeholder block is enough.
    if (reducedMotion) return;
    translateX.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, [translateX, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${translateX.value * 100}%` as unknown as number }],
  }));

  // The sweep has to stay brighter than the block it crosses or it's invisible; both
  // schemes now sit on the same navy, so they differ only in intensity. Alphas come from
  // `palette.white` rather than inline rgba() — the design system owns those values.
  const shimmerColors =
    colorScheme === 'dark'
      ? (['transparent', palette.white[10], 'transparent'] as const)
      : (['transparent', palette.white[20], 'transparent'] as const);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      className={cn(skeletonVariants({ shape }), className)}
      style={style}
    >
      <AnimatedLinearGradient
        colors={shimmerColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '100%' }, animatedStyle]}
      />
    </View>
  );
}

export { skeletonVariants };
