import type { SegmentedTabsItem } from './segmented-tabs';

export interface SegmentedTabsPillProps<TValue extends string> {
  items: SegmentedTabsItem<TValue>[];
  selectedValue: TValue;
  onSelectValue: (value: TValue) => void;
}
