import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// ─── Config ───────────────────────────────────────────────────────────────────

interface LineConfig {
  xFraction: number;
  width: number;
  height: number;
  opacity: number;
  duration: number;
  delay: number;
}

const LINE_CONFIGS: LineConfig[] = [
  { xFraction: 0.08, width: 2, height: 110, opacity: 0.18, duration: 1800, delay: 0 },
  { xFraction: 0.14, width: 3, height: 75, opacity: 0.22, duration: 2200, delay: 320 },
  { xFraction: 0.19, width: 2, height: 140, opacity: 0.15, duration: 1650, delay: 80 },
  { xFraction: 0.27, width: 4, height: 95, opacity: 0.25, duration: 2000, delay: 600 },
  { xFraction: 0.33, width: 2, height: 60, opacity: 0.19, duration: 2400, delay: 150 },
  { xFraction: 0.41, width: 5, height: 160, opacity: 0.14, duration: 1900, delay: 900 },
  { xFraction: 0.46, width: 3, height: 85, opacity: 0.27, duration: 1700, delay: 440 },
  { xFraction: 0.52, width: 2, height: 120, opacity: 0.2, duration: 2100, delay: 1100 },
  { xFraction: 0.58, width: 4, height: 70, opacity: 0.24, duration: 2500, delay: 250 },
  { xFraction: 0.63, width: 2, height: 100, opacity: 0.17, duration: 1600, delay: 750 },
  { xFraction: 0.7, width: 3, height: 155, opacity: 0.21, duration: 2300, delay: 1400 },
  { xFraction: 0.77, width: 5, height: 80, opacity: 0.28, duration: 1750, delay: 550 },
  { xFraction: 0.84, width: 2, height: 130, opacity: 0.19, duration: 2600, delay: 1800 },
  { xFraction: 0.91, width: 3, height: 65, opacity: 0.25, duration: 2050, delay: 980 },
];

const SECONDARY_LINE_CONFIGS: LineConfig[] = [
  { xFraction: 0.04, width: 3, height: 90, opacity: 0.3, duration: 2000, delay: 200 },
  { xFraction: 0.11, width: 2, height: 125, opacity: 0.26, duration: 1750, delay: 500 },
  { xFraction: 0.22, width: 4, height: 80, opacity: 0.32, duration: 2300, delay: 100 },
  { xFraction: 0.3, width: 2, height: 150, opacity: 0.28, duration: 1850, delay: 700 },
  { xFraction: 0.37, width: 3, height: 65, opacity: 0.3, duration: 2150, delay: 1200 },
  { xFraction: 0.44, width: 2, height: 105, opacity: 0.24, duration: 2400, delay: 350 },
  { xFraction: 0.55, width: 4, height: 75, opacity: 0.31, duration: 1950, delay: 850 },
  { xFraction: 0.61, width: 2, height: 135, opacity: 0.27, duration: 2250, delay: 50 },
  { xFraction: 0.67, width: 3, height: 88, opacity: 0.29, duration: 1700, delay: 1500 },
  { xFraction: 0.74, width: 2, height: 115, opacity: 0.25, duration: 2500, delay: 650 },
  { xFraction: 0.8, width: 5, height: 70, opacity: 0.33, duration: 1800, delay: 1100 },
  { xFraction: 0.88, width: 2, height: 100, opacity: 0.27, duration: 2050, delay: 400 },
  { xFraction: 0.95, width: 3, height: 55, opacity: 0.31, duration: 2350, delay: 1700 },
];

// ─── MotionLine ───────────────────────────────────────────────────────────────

function MotionLine({
  cfg,
  color,
  screenWidth,
  screenHeight,
}: {
  cfg: LineConfig;
  color: string;
  screenWidth: number;
  screenHeight: number;
}) {
  const translateY = useSharedValue(screenHeight + cfg.height);

  useEffect(() => {
    translateY.value = withDelay(
      cfg.delay,
      withRepeat(
        withTiming(-(cfg.height + 20), {
          duration: cfg.duration,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(translateY);
    };
  }, [translateY, cfg]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: screenWidth * cfg.xFraction,
          top: 0,
          width: cfg.width,
          height: cfg.height,
          backgroundColor: color,
          opacity: cfg.opacity,
          borderRadius: cfg.width / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

// ─── MotionLinesBackground ────────────────────────────────────────────────────

export interface MotionLinesBackgroundProps {
  /** Primary line color — subtle tone against the backdrop. */
  color: string;
  /** Secondary layer color — slightly more prominent for depth. */
  secondaryColor?: string;
}

/**
 * Full-screen layer of thin vertical lines streaming upward. Absolutely
 * positioned with pointerEvents="none" so it never intercepts touches.
 * Reuse anywhere a motion/energy background is needed.
 */
export function MotionLinesBackground({ color, secondaryColor }: MotionLinesBackgroundProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  // Purely decorative streaming lines — skip the dozens of infinite loops entirely.
  if (reducedMotion) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {LINE_CONFIGS.map((cfg, index) => (
        <MotionLine
          // biome-ignore lint/suspicious/noArrayIndexKey: LINE_CONFIGS is a static constant — index is a stable positional key
          key={index}
          cfg={cfg}
          color={color}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
        />
      ))}
      {secondaryColor &&
        SECONDARY_LINE_CONFIGS.map((cfg, index) => (
          <MotionLine
            // biome-ignore lint/suspicious/noArrayIndexKey: SECONDARY_LINE_CONFIGS is a static constant — index is a stable positional key
            key={`s${index}`}
            cfg={cfg}
            color={secondaryColor}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
          />
        ))}
    </View>
  );
}
