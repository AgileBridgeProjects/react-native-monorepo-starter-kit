import { Pressable, View } from 'react-native';
import { cn } from '@/src/lib/cn';
import type { FilterChipProps } from './filter-chip.types';
import { Typography } from './typography';

export type { FilterChipProps } from './filter-chip.types';

/** Solid equivalent of the native iPhone glass chip for Android, web, and older iOS versions. */
export function FilterChip({ label, selected, testID, onPress }: FilterChipProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className="touch-target items-center justify-center active:opacity-70"
    >
      <View
        className={cn(
          'h-8 items-center justify-center rounded-full border px-sm',
          selected ? 'border-accent bg-accent' : 'border-white/15 bg-brand-blue-card-dark',
        )}
      >
        <Typography
          variant="caption"
          className={selected ? 'font-semibold text-brand-blue-screen' : 'font-medium text-white'}
        >
          {label}
        </Typography>
      </View>
    </Pressable>
  );
}
