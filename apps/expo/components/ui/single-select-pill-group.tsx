import { Pressable, View } from 'react-native';
import { cn } from '@/src/lib/cn';
import { Typography } from './typography';

export interface ChipOption {
  value: string;
  label: string;
}

interface SingleSelectPillGroupProps {
  options: ChipOption[];
  value: string | null;
  onChange: (next: string) => void;
  getTestId?: (value: string) => string;
}

/** One badge selected at a time — a generic single-select control for a small, fixed option set. */
export function SingleSelectPillGroup({
  options,
  value,
  onChange,
  getTestId,
}: SingleSelectPillGroupProps) {
  return (
    <View className="flex-row flex-wrap gap-xs">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            testID={getTestId?.(option.value)}
            className={cn(
              // `px-md` (not `px-sm`) so each badge claims more of the row's
              // width — a handful of short labels no longer bunch up on one
              // side with a ragged gap on the other.
              'touch-target items-center justify-center rounded-full px-md py-xs',
              isSelected ? 'bg-primary' : 'bg-brand-blue-input-fill',
            )}
          >
            <Typography variant="caption" className="text-white">
              {option.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
