import { cn } from '@lib/cn';
import { cva } from 'class-variance-authority';
import { Pressable, View } from 'react-native';
import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SegmentedTabsPill } from './segmented-tabs-pill';
import { Typography } from './typography';

const segmentedTabVariants = cva(
  'touch-target flex-1 items-center justify-center rounded-lg border px-sm py-sm',
  {
    variants: {
      selected: {
        true: 'border-primary bg-primary',
        false: 'border-border bg-surface',
      },
    },
  },
);

const segmentedTabTextVariants = cva('font-semibold uppercase', {
  variants: {
    selected: {
      true: 'text-primary-foreground',
      false: 'text-text',
    },
  },
});

export interface SegmentedTabsItem<TValue extends string> {
  value: TValue;
  label: string;
  testID?: string;
  accessibilityLabel?: string;
}

export interface SegmentedTabsProps<TValue extends string> {
  items: SegmentedTabsItem<TValue>[];
  selectedValue: TValue;
  onSelectValue: (value: TValue) => void;
  /**
   * 'default' — separate bordered buttons (original style).
   * 'connected' — single surface pill, active tab lifts to bg-background with
   * a subtle shadow. Matches the ActivityPeriodToggle pattern.
   * 'pill' — self-centered bar in the settings-card navy (bg-brand-blue-card-dark),
   * content-width items; the active tab gets a solid white pill, inactive tabs are
   * plain white/70 text. For screens on `bg-brand-blue-screen` only (see
   * GradientBackground) — the white/navy contrast is hardcoded, not theme-aware,
   * because that background doesn't change with light/dark mode.
   */
  variant?: 'default' | 'connected' | 'pill';
}

export function SegmentedTabs<TValue extends string>({
  items,
  selectedValue,
  onSelectValue,
  variant = 'default',
}: SegmentedTabsProps<TValue>) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const theme = colors[colorScheme];

  if (variant === 'pill') {
    return (
      <SegmentedTabsPill
        items={items}
        selectedValue={selectedValue}
        onSelectValue={onSelectValue}
      />
    );
  }

  if (variant === 'connected') {
    return (
      <View className="flex-row items-center gap-xs rounded-lg bg-surface p-xs">
        {items.map((item) => {
          const isSelected = item.value === selectedValue;
          return (
            <Pressable
              key={item.value}
              className={cn(
                'flex-1 items-center justify-center rounded-md px-sm py-xs',
                isSelected && 'bg-background',
              )}
              style={isSelected ? { boxShadow: `0px 1px 2px ${theme.text}10` } : undefined}
              onPress={() => onSelectValue(item.value)}
              testID={item.testID}
              accessibilityRole="button"
              accessibilityLabel={item.accessibilityLabel ?? item.label}
              accessibilityState={{ selected: isSelected }}
            >
              <Typography
                variant="caption"
                className={isSelected ? 'font-semibold text-text' : 'text-text-muted'}
              >
                {item.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View className="flex-row gap-sm">
      {items.map((item) => {
        const isSelected = item.value === selectedValue;

        return (
          <Pressable
            key={item.value}
            className={segmentedTabVariants({ selected: isSelected })}
            onPress={() => onSelectValue(item.value)}
            testID={item.testID}
            accessibilityRole="button"
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            accessibilityState={{ selected: isSelected }}
          >
            <Typography
              variant="caption"
              className={cn(segmentedTabTextVariants({ selected: isSelected }))}
            >
              {item.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
