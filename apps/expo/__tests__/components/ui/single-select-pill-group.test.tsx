import React from 'react';
import { Pressable, Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { SingleSelectPillGroup } from '@/components/ui/single-select-pill-group';

vi.mock('@/components/ui/typography', () => ({
  Typography: ({ children }: { children?: React.ReactNode }) => <Text>{children}</Text>,
}));

function renderGroup(props: Parameters<typeof SingleSelectPillGroup>[0]) {
  let renderer: ReturnType<typeof create> | undefined;
  act(() => {
    renderer = create(React.createElement(SingleSelectPillGroup, props));
  });
  if (!renderer) throw new Error('Expected renderer to be created.');
  return renderer;
}

describe('SingleSelectPillGroup', () => {
  it('renders all option labels', () => {
    const renderer = renderGroup({
      options: [
        { value: 'Active', label: 'Active' },
        { value: 'Historical', label: 'Historical' },
      ],
      value: 'Active',
      onChange: vi.fn(),
    });

    const labels = renderer.root
      .findAllByType(Text)
      .map((n: { props: { children?: unknown } }) => n.props.children);
    expect(labels).toContain('Active');
    expect(labels).toContain('Historical');
  });

  it('marks only the current value as selected', () => {
    const renderer = renderGroup({
      options: [
        { value: 'Active', label: 'Active' },
        { value: 'Historical', label: 'Historical' },
      ],
      value: 'Historical',
      onChange: vi.fn(),
    });

    const [active, historical] = renderer.root.findAllByType(Pressable);
    expect(active.props.accessibilityState.selected).toBeFalsy();
    expect(historical.props.accessibilityState.selected).toBeTruthy();
  });

  it('calls onChange with the pressed option value', () => {
    const onChange = vi.fn();
    const renderer = renderGroup({
      options: [{ value: 'BeingManaged', label: 'Being managed' }],
      value: 'Active',
      onChange,
    });

    act(() => {
      renderer.root.findByType(Pressable).props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith('BeingManaged');
  });
});
