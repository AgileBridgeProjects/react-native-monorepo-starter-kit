import { Pressable, View } from 'react-native';

import { cn } from '@/src/lib/cn';
import { Typography } from './typography';

export interface OptionCardRowProps {
  /** Display letter (A–D…) — purely presentational; carries no meaning about the answer. */
  letter: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * A single answer option — full-width card with a circular letter badge. The shared single-select
 * option shape for every question flow in the app,
 * so the two never drift apart visually.
 */
export function OptionCardRow({
  letter,
  label,
  selected,
  onPress,
  disabled = false,
  testID,
}: OptionCardRowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      // Deliberately no dimmed state for `disabled`. In the flows that use it, it is only set for the
      // ~180ms between a tap and the next question arriving, and fading all four rows out and back
      // in across that window was the flash — it announced a network call the user never needed to
      // know about. `disabled` still blocks the press; it just does it silently.
      className={cn(
        'min-h-24 flex-row items-center gap-md rounded-2xl border-2 bg-brand-blue-card-dark px-lg py-lg',
        selected ? 'border-primary' : 'border-transparent',
      )}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
        <Typography variant="h4" className="text-brand-blue-dark">
          {letter}
        </Typography>
      </View>
      <Typography variant="body" className="flex-1 text-sm text-white">
        {label}
      </Typography>
    </Pressable>
  );
}
