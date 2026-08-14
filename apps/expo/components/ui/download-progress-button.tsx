import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Rect } from 'react-native-svg';
import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface DownloadProgressButtonProps {
  /** 0–1 fraction. `null` = indeterminate (shows full ring spinning). */
  progress: number | null;
  /** Called when the user taps the stop/cancel button. */
  onCancel: () => void;
  /** Outer diameter in dp. @default 32 */
  size?: number;
  /** Ring stroke width. @default 2.5 */
  strokeWidth?: number;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Spotify-style circular progress button with a square stop icon in the centre.
 * Shows a progress ring that fills as the download progresses, and tapping it
 * cancels the download.
 */
export function DownloadProgressButton({
  progress,
  onCancel,
  size = 32,
  strokeWidth = 2.5,
  accessibilityLabel = 'Cancel download',
  testID,
}: DownloadProgressButtonProps) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const theme = colors[colorScheme];

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Indeterminate: spin a full ring; determinate: fixed arc showing fraction.
  const isIndeterminate = progress === null;
  const fraction = isIndeterminate ? 1 : progress;
  const strokeDashoffset = circumference * (1 - fraction);

  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isIndeterminate) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [isIndeterminate, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Stop icon: small rounded square in the centre
  const stopSize = size * 0.32;
  const stopOffset = (size - stopSize) / 2;
  const stopRadius = stopSize * 0.15;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onCancel}
      hitSlop={8}
      testID={testID}
      className="items-center justify-center"
    >
      <Animated.View style={spinStyle}>
        <Svg width={size} height={size}>
          {/* Background track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress arc */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
          {/* Stop square */}
          <Rect
            x={stopOffset}
            y={stopOffset}
            width={stopSize}
            height={stopSize}
            rx={stopRadius}
            ry={stopRadius}
            fill={theme.textMuted}
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}
