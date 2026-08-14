import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { cn } from '@/src/lib/cn';

type SegmentState = 'done' | 'current' | 'upcoming';

function Segment({ state }: { state: SegmentState }) {
  // Landing on a step sweeps its segment full — a quick "you advanced" beat.
  // Past segments stay full without animating so a re-render never replays them.
  const fill = useSharedValue(state === 'done' ? 1 : 0);
  useEffect(() => {
    if (state === 'upcoming') {
      fill.value = 0;
    } else if (state === 'done') {
      fill.value = 1;
    } else {
      fill.value = withTiming(1, { duration: 350 });
    }
  }, [state, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
      <Animated.View className="h-full rounded-full bg-white" style={fillStyle} />
    </View>
  );
}

export interface StoryProgressBarProps {
  total: number;
  /** Zero-based index of the step the athlete is on. */
  current: number;
  className?: string;
  testID?: string;
}

/** Sectioned stories-style progress: one segment per exercise step. */
export function StoryProgressBar({ total, current, className, testID }: StoryProgressBarProps) {
  const states = Array.from({ length: total }, (_, index): SegmentState => {
    if (index < current) return 'done';
    if (index === current) return 'current';
    return 'upcoming';
  });
  return (
    // `gap-xs`, not the hairline `gap-2xs`: with 4px-tall segments a 2px gap
    // reads as one continuous bar instead of sectioned story segments.
    <View className={cn('flex-row gap-xs', className)} testID={testID}>
      {states.map((state, index) => (
        // Position is the only identity a segment has.
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length positional list
        <Segment key={index} state={state} />
      ))}
    </View>
  );
}
