import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Typography } from './typography';

/**
 * The "tap to continue/begin" caption, breathing gently so the invitation to
 * tap reads as alive rather than as a disabled label.
 */
export function TapHint({ label }: { label: string }) {
  // Keep the caption itself above WCAG AA contrast on the app's darkest
  // completion surfaces; a 0.35 trough made this small text too faint.
  const glow = useSharedValue(0.72);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0.72, { duration: 900 })),
      -1,
      true,
    );
  }, [glow]);

  const style = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <Animated.View style={style}>
      <Typography variant="caption" className="text-center text-white">
        {label}
      </Typography>
    </Animated.View>
  );
}
