import { createRef } from 'react';
import { FlatList } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { ResponsiveGrid } from '@/components/ui/responsive-grid';

vi.mock('@lib/hooks/use-breakpoints', () => ({
  useBreakpoints: () => ({
    numColumns: 2,
  }),
}));

describe('ResponsiveGrid', () => {
  it('forwards the provided list ref to the underlying FlatList', () => {
    const flatListRef = createRef<FlatList<{ id: string }>>();
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <ResponsiveGrid
          data={[{ id: '1' }]}
          flatListRef={flatListRef}
          keyExtractor={(item) => item.id}
          renderItem={() => null}
        />,
      );
    });

    if (!renderer) {
      throw new Error('Expected ResponsiveGrid renderer to be created.');
    }

    const list = renderer.root.findByType(FlatList);

    expect(list.props.ref).toBe(flatListRef);
  });

  it('uses the explicit column override when one is provided', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <ResponsiveGrid
          data={[{ id: '1' }]}
          numColumnsOverride={1}
          keyExtractor={(item) => item.id}
          renderItem={() => null}
        />,
      );
    });

    if (!renderer) {
      throw new Error('Expected ResponsiveGrid renderer to be created.');
    }

    const list = renderer.root.findByType(FlatList);

    expect(list.props.numColumns).toBe(1);
  });

  it('renders raw data without placeholder entries in single-column mode', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <ResponsiveGrid
          data={[{ id: '1' }, { id: '2' }]}
          numColumnsOverride={1}
          keyExtractor={(item) => item.id}
          renderItem={() => null}
        />,
      );
    });

    if (!renderer) {
      throw new Error('Expected ResponsiveGrid renderer to be created.');
    }

    const list = renderer.root.findByType(FlatList);

    expect(list.props.data).toEqual([{ id: '1' }, { id: '2' }]);
    expect(list.props.columnWrapperStyle).toBeUndefined();
  });

  it('caps the responsive column count when maxColumns is provided', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <ResponsiveGrid
          data={[{ id: '1' }, { id: '2' }, { id: '3' }]}
          maxColumns={1}
          keyExtractor={(item) => item.id}
          renderItem={() => null}
        />,
      );
    });

    if (!renderer) {
      throw new Error('Expected ResponsiveGrid renderer to be created.');
    }

    const list = renderer.root.findByType(FlatList);

    expect(list.props.numColumns).toBe(1);
    expect(list.props.data).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
  });

  it('pads incomplete rows with placeholder items so column widths stay consistent', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <ResponsiveGrid
          data={[{ id: '1' }, { id: '2' }, { id: '3' }]}
          keyExtractor={(item) => item.id}
          renderItem={() => null}
        />,
      );
    });

    if (!renderer) {
      throw new Error('Expected ResponsiveGrid renderer to be created.');
    }

    const list = renderer.root.findByType(FlatList);

    expect(list.props.data).toHaveLength(4);
    expect(list.props.data[3]).toEqual({
      id: 'placeholder-0',
      index: 3,
      isPlaceholder: true,
      item: null,
    });
  });
});
