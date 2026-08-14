import { ScrollView } from 'react-native';
import { FilterChip } from './filter-chip';

export interface FilterChipRowItem {
  id: string;
  label: string;
}

export interface FilterChipRowProps {
  items: FilterChipRowItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  testID?: string;
  /** Returns the testID for each chip by item id. */
  getItemTestId?: (id: string) => string;
  /** Override the ScrollView contentContainerClassName. Defaults to `gap-sm pr-lg`. */
  contentContainerClassName?: string;
}

/**
 * A single, horizontally scrollable row of single-select filter chips. On iOS 26+, each chip
 * gets its own native Liquid Glass material via `FilterChip`'s platform variant.
 */
export function FilterChipRow({
  items,
  selectedId,
  onSelect,
  testID,
  getItemTestId,
  contentContainerClassName,
}: FilterChipRowProps) {
  return (
    <ScrollView
      horizontal
      testID={testID}
      showsHorizontalScrollIndicator={false}
      contentContainerClassName={contentContainerClassName ?? 'gap-sm pr-lg'}
    >
      {items.map((item) => (
        <FilterChip
          key={item.id}
          testID={getItemTestId?.(item.id)}
          label={item.label}
          selected={item.id === selectedId}
          onPress={() => onSelect(item.id)}
        />
      ))}
    </ScrollView>
  );
}
