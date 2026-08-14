import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { springs } from '@/constants/tokens';

const PRESS_SCALE = 0.97;
/**
 * `springs.snap`, not the shared Button's own press spring (damping 15 /
 * stiffness 300 / mass 1, ratio ≈0.43 — meaningfully underdamped): that is
 * fine on a small label-sized hitbox where the oscillation is a couple of
 * pixels, but stretched over a full-width card it reads as a visible,
 * lingering wobble.
 */
const PRESS_SPRING = springs.snap;

export interface BouncePressableProps {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  className?: string;
  /** For runtime values a class cannot express (e.g. a themed border colour). */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Pressable card wrapper with the subtle quick press bounce the shared Button
 * has — cards without press feedback read as static images.
 */
export function BouncePressable({
  onPress,
  accessibilityLabel,
  children,
  className,
  style,
  testID,
}: BouncePressableProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(PRESS_SCALE, PRESS_SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, PRESS_SPRING);
        }}
        className={className}
        style={style}
        testID={testID}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
