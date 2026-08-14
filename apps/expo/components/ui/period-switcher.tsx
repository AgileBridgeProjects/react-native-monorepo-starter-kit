import { Pressable, View } from 'react-native';
import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Icon } from './icon';
import { Typography } from './typography';

export interface PeriodSwitcherProps {
  label: string;
  onPreviousPress: () => void;
  onNextPress: () => void;
  previousLabel: string;
  nextLabel: string;
}

export function PeriodSwitcher({
  label,
  onPreviousPress,
  onNextPress,
  previousLabel,
  nextLabel,
}: PeriodSwitcherProps) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;

  return (
    <View className="flex-row items-center justify-center gap-md bg-surface">
      <Pressable
        className="touch-target rounded-xl border border-border bg-surface px-sm py-sm"
        accessibilityRole="button"
        accessibilityLabel={previousLabel}
        onPress={onPreviousPress}
      >
        <Icon name="chevron.left" color={colors[colorScheme].icon} />
      </Pressable>

      <Typography variant="body">{label}</Typography>

      <Pressable
        className="touch-target rounded-xl border border-border bg-surface px-sm py-sm"
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
        onPress={onNextPress}
      >
        <Icon name="chevron.right" color={colors[colorScheme].icon} />
      </Pressable>
    </View>
  );
}
