import { iconSize } from '@starterkit/shared';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '@/src/lib/cn';
import { Icon } from './icon';

export interface GlowBadgeProps {
  /** SF Symbol name — must be mapped in icon-symbol.tsx. */
  icon: string;
  iconColor: string;
  /** Tint classes for the badge circle and its halo, e.g. 'bg-success/20'. */
  circleClassName: string;
  testID?: string;
}

/** One breath of the halo — slow enough to read as a glow, not a blink. */
const GLOW_CYCLE_MS = 2000;

/**
 * A circular icon crowned with a soft, breathing halo — the designed header
 * for the good/bad list cards (a green glowing check, a red x), so a list's
 * sentiment lands before its first word is read.
 */
export function GlowBadge({ icon, iconColor, circleClassName, testID }: GlowBadgeProps) {
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: GLOW_CYCLE_MS }), -1, true);
  }, [glow]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 - glow.value * 0.35,
    transform: [{ scale: 1.15 + glow.value * 0.3 }],
  }));

  return (
    <View className="size-16 items-center justify-center" testID={testID}>
      <Animated.View
        pointerEvents="none"
        style={haloStyle}
        className={cn('absolute size-12 rounded-full', circleClassName)}
      />
      <View className={cn('size-12 items-center justify-center rounded-full', circleClassName)}>
        <Icon name={icon} size={iconSize.md} color={iconColor} />
      </View>
    </View>
  );
}
