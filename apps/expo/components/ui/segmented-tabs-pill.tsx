import { Pressable, View } from 'react-native';
import { cn } from '@/src/lib/cn';
import type { SegmentedTabsPillProps } from './segmented-tabs-pill.types';
import { Typography } from './typography';

export function SegmentedTabsPill<TValue extends string>({
  items,
  selectedValue,
  onSelectValue,
}: SegmentedTabsPillProps<TValue>) {
  return (
    <View className="w-full flex-row items-center gap-xs rounded-full bg-brand-blue-card-dark p-xs">
      {items.map((item) => {
        const isSelected = item.value === selectedValue;
        return (
          <Pressable
            key={item.value}
            className={cn(
              'touch-target flex-1 items-center justify-center rounded-full px-md py-sm',
              isSelected && 'bg-white',
            )}
            onPress={() => onSelectValue(item.value)}
            testID={item.testID}
            accessibilityRole="button"
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            accessibilityState={{ selected: isSelected }}
          >
            <Typography
              variant="body-sm"
              className={isSelected ? 'font-semibold text-brand-blue-screen' : 'text-white/70'}
            >
              {item.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
