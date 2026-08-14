import { useBreakpoints } from '@lib/hooks/use-breakpoints';
import type { Ref } from 'react';
import { useMemo } from 'react';
import type { FlatListProps } from 'react-native';
import { FlatList, View } from 'react-native';

import { spacing } from '@/constants/tokens';

interface ResponsiveGridEntry<T> {
  id: string;
  index: number;
  isPlaceholder: boolean;
  item: T | null;
}

interface ResponsiveGridProps<T>
  extends Omit<FlatListProps<T>, 'numColumns' | 'columnWrapperStyle' | 'key'> {
  data: T[];
  flatListRef?: Ref<FlatList<T>>;
  maxColumns?: 1 | 2 | 3;
  numColumnsOverride?: 1 | 2 | 3;
  /** Horizontal gap between columns in a row (multi-column mode only). Defaults to `spacing.md`. */
  columnGap?: number;
}

/**
 * A responsive grid component that automatically adjusts column count based on screen size.
 * Handles column spacing and forced re-renders when orientation changes.
 *
 * Usage:
 * ```tsx
 * <ResponsiveGrid
 *   data={items}
 *   renderItem={({ item }) => <ItemCard item={item} />}
 *   keyExtractor={(item) => item.id}
 * />
 * ```
 */
export function ResponsiveGrid<T extends { id: string }>({
  data,
  flatListRef,
  maxColumns,
  numColumnsOverride,
  columnGap = spacing.md,
  className = 'flex-1 bg-background',
  contentContainerClassName = 'gap-lg px-lg py-lg w-full self-center md:max-w-content',
  contentInsetAdjustmentBehavior = 'automatic',
  // Virtualization defaults — overridable per consumer. Trim the mounted window so
  // long lists (leaderboards, reward grids) render fewer offscreen rows and stay smooth.
  // removeClippedSubviews defaults OFF: it blanks/clips rows containing transforms or
  // out-of-bounds children on Android (e.g. TraineeRankCard's animated scale). Opt in
  // per-list only where rows are static.
  initialNumToRender = 10,
  maxToRenderPerBatch = 10,
  windowSize = 11,
  removeClippedSubviews = false,
  keyExtractor,
  renderItem,
  ...props
}: ResponsiveGridProps<T>) {
  const { numColumns } = useBreakpoints();
  const resolvedNumColumns =
    numColumnsOverride ??
    ((maxColumns ? Math.min(numColumns, maxColumns) : numColumns) as 1 | 2 | 3);
  const flatListProps = props as unknown as FlatListProps<ResponsiveGridEntry<T>>;
  const singleColumnProps = props as FlatListProps<T>;
  const gridData = useMemo(() => {
    const entries: ResponsiveGridEntry<T>[] = data.map((item, index) => ({
      id: keyExtractor ? keyExtractor(item, index) : item.id,
      index,
      isPlaceholder: false,
      item,
    }));

    if (resolvedNumColumns === 1 || entries.length === 0) {
      return entries;
    }

    const remainder = entries.length % resolvedNumColumns;

    if (remainder === 0) {
      return entries;
    }

    const placeholderCount = resolvedNumColumns - remainder;

    return [
      ...entries,
      ...Array.from({ length: placeholderCount }, (_, placeholderIndex) => ({
        id: `placeholder-${placeholderIndex}`,
        index: entries.length + placeholderIndex,
        isPlaceholder: true,
        item: null,
      })),
    ];
  }, [data, keyExtractor, resolvedNumColumns]);

  if (resolvedNumColumns === 1) {
    return (
      <FlatList<T>
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        {...singleColumnProps}
        ref={flatListRef}
        data={data}
        className={className}
        contentContainerClassName={contentContainerClassName}
        contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
        initialNumToRender={initialNumToRender}
        maxToRenderPerBatch={maxToRenderPerBatch}
        windowSize={windowSize}
        removeClippedSubviews={removeClippedSubviews}
        key="single-column"
        numColumns={1}
        keyExtractor={keyExtractor ?? ((item) => item.id)}
        renderItem={renderItem}
      />
    );
  }

  return (
    <FlatList<ResponsiveGridEntry<T>>
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      {...flatListProps}
      ref={flatListRef as Ref<FlatList<ResponsiveGridEntry<T>>>}
      data={gridData}
      className={className}
      contentContainerClassName={contentContainerClassName}
      contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      removeClippedSubviews={removeClippedSubviews}
      key={String(resolvedNumColumns)}
      numColumns={resolvedNumColumns}
      columnWrapperStyle={
        resolvedNumColumns > 1 ? { gap: columnGap, alignItems: 'stretch' as const } : undefined
      }
      keyExtractor={(entry) => entry.id}
      renderItem={({ item: entry, ...rest }) => {
        if (entry.isPlaceholder || !renderItem) {
          return <View className="flex-1" />;
        }

        return (
          <View className="flex-1">
            {renderItem({
              ...rest,
              index: entry.index,
              item: entry.item as T,
            })}
          </View>
        );
      }}
    />
  );
}

export type { ResponsiveGridProps };
