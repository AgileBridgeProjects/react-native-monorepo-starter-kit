import type { IconSymbolName } from '@/components/ui/icon-symbol';

export interface IconSegmentedControlItem<TValue extends string> {
  value: TValue;
  /** SF Symbol name; the Android fallback maps it through the shared icon map. */
  icon: IconSymbolName;
  /** Required — an icon-only control has no visible text to name it. */
  accessibilityLabel: string;
  testID?: string;
}

export interface IconSegmentedControlProps<TValue extends string> {
  items: ReadonlyArray<IconSegmentedControlItem<TValue>>;
  selectedValue: TValue;
  onSelectValue: (value: TValue) => void;
  className?: string;
  testID?: string;
}
