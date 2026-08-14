import React from 'react';
import { Pressable, Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { CategoryFilter } from '@/components/ui/category-filter';

vi.mock('@/components/ui/typography', () => ({
  Typography: ({ children }: { children?: React.ReactNode }) => <Text>{children}</Text>,
}));

function renderFilter(props: Parameters<typeof CategoryFilter>[0]) {
  let renderer: ReturnType<typeof create> | undefined;

  act(() => {
    renderer = create(React.createElement(CategoryFilter, props));
  });

  if (!renderer) {
    throw new Error('Expected CategoryFilter renderer to be created.');
  }

  return renderer;
}

describe('CategoryFilter', () => {
  it('renders all item labels', () => {
    const renderer = renderFilter({
      items: [
        { id: 'all', label: 'All' },
        { id: 'technology', label: 'Technology' },
      ],
      selectedId: 'all',
      onSelect: vi.fn(),
    });

    const textValues = renderer.root
      .findAllByType(Text)
      .map((node: { props: { children?: unknown } }) => node.props.children);

    expect(textValues).toContain('All');
    expect(textValues).toContain('Technology');
  });

  it('marks the selected item as selected for accessibility', () => {
    const renderer = renderFilter({
      items: [{ id: 'technology', label: 'Technology' }],
      selectedId: 'technology',
      onSelect: vi.fn(),
    });

    const pill = renderer.root.findByType(Pressable);
    expect(pill.props.accessibilityState.selected).toBeTruthy();
  });

  it('does not mark unselected items as selected', () => {
    const renderer = renderFilter({
      items: [{ id: 'technology', label: 'Technology' }],
      selectedId: 'other',
      onSelect: vi.fn(),
    });

    const pill = renderer.root.findByType(Pressable);
    expect(pill.props.accessibilityState.selected).toBeFalsy();
  });

  it('calls onSelect with the item id when pressed', () => {
    const onSelect = vi.fn();
    const renderer = renderFilter({
      items: [{ id: 'technology', label: 'Technology' }],
      selectedId: 'all',
      onSelect,
    });

    const pill = renderer.root.findByType(Pressable);
    act(() => {
      pill.props.onPress();
    });

    expect(onSelect).toHaveBeenCalledWith('technology');
  });

  it('applies testID and getItemTestId', () => {
    const renderer = renderFilter({
      items: [{ id: 'foo', label: 'Foo' }],
      selectedId: 'foo',
      onSelect: vi.fn(),
      testID: 'filter-scroll',
      getItemTestId: (id) => `pill-${id}`,
    });

    const pill = renderer.root.findByType(Pressable);
    expect(pill.props.testID).toBe('pill-foo');
  });
});
