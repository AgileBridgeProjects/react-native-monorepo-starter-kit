import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { cn } from '@/src/lib/cn';

/** Smooth spring config for the progress-bar fill animation. */
const SPRING_SMOOTH = { damping: 20, stiffness: 180, mass: 0.8 } as const;

export interface ProgressBarProps {
  /** Current progress as a percentage (0–100). Use MathUtil.percentage() to compute this. */
  value: number;
  /** Optional className applied to the track (outer container). */
  className?: string;
  /** Optional hex colour for the filled bar (overrides the default accent). */
  trackColor?: string;
  /** Optional hex colour for the empty track background (overrides the default bg-border). */
  backgroundColor?: string;
  /** Optional testID for E2E targeting. */
  testID?: string;
}

export function ProgressBar({
  value,
  className,
  trackColor,
  backgroundColor,
  testID,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const progress = useSharedValue(clamped);

  useEffect(() => {
    progress.value = withSpring(clamped, SPRING_SMOOTH);
  }, [clamped, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View
      testID={testID}
      className={cn(
        'h-2 w-full overflow-hidden rounded-full',
        !backgroundColor && 'bg-border',
        className,
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <Animated.View
        style={[animatedStyle, trackColor ? { backgroundColor: trackColor } : undefined]}
        className={cn('h-2 rounded-full', !trackColor && 'bg-accent')}
      />
    </View>
  );
}
