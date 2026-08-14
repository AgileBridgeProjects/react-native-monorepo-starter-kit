import { View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import type { IconSymbolName } from '@/components/ui/icon-symbol';
import { cn } from '@/src/lib/cn';
import { Typography } from './typography';

export interface StatusChipProps {
  label: string;
  /** SF Symbol icon name — rendered at size 10 in white. */
  iconName?: IconSymbolName;
  /** Tailwind background class, e.g. `bg-error`, `bg-success`, `bg-accent`. */
  containerClassName?: string;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
}

/**
 * Small rounded-pill status badge — used on game cards (New / Passed / Mastered)
 * and topic cards (New / Completed). Single source of truth for chip shape, padding,
 * and text style.
 */
export function StatusChip({
  label,
  iconName,
  containerClassName,
  testID,
  accessible,
  accessibilityLabel,
}: StatusChipProps) {
  return (
    <View
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      className={cn('flex-row items-center gap-1 rounded-full px-2 py-0.5', containerClassName)}
    >
      {iconName && <Icon name={iconName} size={10} color="white" />}
      <Typography variant="caption" className="text-xs font-semibold text-white">
        {label}
      </Typography>
    </View>
  );
}
