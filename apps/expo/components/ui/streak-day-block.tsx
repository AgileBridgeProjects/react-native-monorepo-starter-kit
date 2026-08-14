import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { animationConfig } from '@/constants/animations';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Icon } from './icon';
import { Typography } from './typography';

export const BLOCK_HEIGHT = 52;

const BURST_COUNT = 7;

export interface DayCell {
  date: string;
  active: boolean;
  label: string;
  isToday: boolean;
  isPast: boolean;
}

export interface DayBlockColors {
  accent: string;
  blockFill: string;
  missedFill: string;
  onAccent: string;
  subtle: string;
  muted: string;
}

function BurstParticle({
  tx,
  ty,
  size,
  color,
  delay,
}: {
  tx: number;
  ty: number;
  size: number;
  color: string;
  delay: number;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 110 }),
        withTiming(1, { duration: 260 }),
        withTiming(0, { duration: 260 }),
      ),
    );
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 660, easing: animationConfig.easing.decelerate }),
    );
    return () => {
      cancelAnimation(progress);
      cancelAnimation(opacity);
    };
  }, [delay, opacity, progress]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      position: 'absolute',
      left: tx * t,
      top: ty * t + 20 * t * t,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      opacity: opacity.value,
    };
  });

  return <Animated.View style={style} />;
}

function ConfettiBurst({ burstColors }: { burstColors: readonly string[] }) {
  const particles = useMemo(
    () =>
      Array.from({ length: BURST_COUNT }, (_, i) => {
        const angle = (Math.PI * 2 * i) / BURST_COUNT - Math.PI / 2;
        const dist = 28 + (i % 3) * 12;
        return {
          id: `burst-${i}`,
          tx: Math.cos(angle) * dist,
          ty: Math.sin(angle) * dist,
          size: 4 + (i % 3),
          color: burstColors[i % burstColors.length] ?? burstColors[0] ?? '#000',
          delay: 150 + (i % 4) * 25,
        };
      }),
    [burstColors],
  );

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: '50%', top: BLOCK_HEIGHT / 2, width: 0, height: 0 }}
    >
      {particles.map((p) => (
        <BurstParticle
          key={p.id}
          tx={p.tx}
          ty={p.ty}
          size={p.size}
          color={p.color}
          delay={p.delay}
        />
      ))}
    </View>
  );
}

export function DayBlock({
  day,
  dailyXp,
  c,
  xpLabel,
  celebrateTick,
  burstColors,
}: {
  day: DayCell;
  dailyXp: number;
  c: DayBlockColors;
  xpLabel: string;
  celebrateTick: number;
  burstColors: readonly string[];
}) {
  const reducedMotion = useReducedMotion();
  const checkScale = useSharedValue(1);
  const ring = useSharedValue(0);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (celebrateTick <= 0 || reducedMotion) return;
    ring.value = 0;
    ring.value = withTiming(1, { duration: 600, easing: animationConfig.easing.decelerate });
    checkScale.value = 0.4;
    checkScale.value = withDelay(130, withSpring(1, { damping: 7, stiffness: 170 }));
    setBurstKey((k) => k + 1);
    return () => {
      cancelAnimation(ring);
      cancelAnimation(checkScale);
    };
  }, [celebrateTick, reducedMotion, ring, checkScale]);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.35, 1], [0, 1, 0]),
    transform: [
      { scale: interpolate(ring.value, [0, 1], [0.5, 1.45]) },
      { rotateZ: `${interpolate(ring.value, [0, 1], [-90, 25])}deg` },
    ],
  }));

  const fill = day.active ? c.accent : day.isPast ? c.missedFill : c.blockFill;
  const todayRing =
    day.isToday && !day.active ? { borderWidth: 2, borderColor: c.accent } : undefined;

  return (
    <View className="flex-1 items-center gap-xs">
      <View
        style={{
          width: '100%',
          height: BLOCK_HEIGHT,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fill,
          ...todayRing,
        }}
      >
        {day.active ? (
          <Animated.View style={checkStyle}>
            <Icon name="checkmark.circle.fill" size={26} color={c.onAccent} />
          </Animated.View>
        ) : day.isPast ? null : (
          <View className="items-center">
            <Typography
              variant="caption"
              className="text-[13px] font-bold leading-none"
              style={{ color: day.isToday ? c.accent : c.subtle }}
            >
              {`${dailyXp}`}
            </Typography>
            <Typography
              variant="caption"
              className="text-[8px] font-semibold leading-none"
              style={{ color: day.isToday ? c.accent : c.muted }}
            >
              {xpLabel}
            </Typography>
          </View>
        )}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 12,
              borderWidth: 2.5,
              borderColor: c.onAccent,
            },
            ringStyle,
          ]}
        />
      </View>
      {burstKey > 0 && !reducedMotion && <ConfettiBurst key={burstKey} burstColors={burstColors} />}
      <Typography
        variant="caption"
        className={day.isToday ? 'text-[10px] font-bold' : 'text-[10px]'}
        style={{ color: day.isToday ? c.accent : c.muted }}
      >
        {day.label}
      </Typography>
    </View>
  );
}
