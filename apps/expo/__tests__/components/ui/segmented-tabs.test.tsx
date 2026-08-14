import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';

import { SegmentedTabs } from '@/components/ui/segmented-tabs';

describe('SegmentedTabs', () => {
  it('renders all labels and applies selection accessibility state', () => {
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <SegmentedTabs
          items={[
            { value: 'week', label: 'This week', testID: 'period-week' },
            { value: 'month', label: 'This month', testID: 'period-month' },
          ]}
          selectedValue="week"
          onSelectValue={() => {}}
        />,
      );
    });

    if (!renderer) {
      throw new Error('Expected segmented tabs renderer to be created.');
    }

    const text = renderer.root
      .findAllByType(Text)
      .flatMap((node: { props: { children?: unknown } }) => node.props.children);

    expect(text).toContain('This week');
    expect(text).toContain('This month');
    expect(renderer.root.findByProps({ testID: 'period-week' }).props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('calls onSelectValue with the pressed item value', () => {
    let selectedValue = 'week';
    let renderer: ReturnType<typeof create> | undefined;

    act(() => {
      renderer = create(
        <SegmentedTabs
          items={[
            { value: 'week', label: 'This week', testID: 'period-week' },
            { value: 'month', label: 'This month', testID: 'period-month' },
          ]}
          selectedValue="week"
          onSelectValue={(value) => {
            selectedValue = value;
          }}
        />,
      );
    });

    if (!renderer) {
      throw new Error('Expected segmented tabs renderer to be created.');
    }

    act(() => {
      renderer.root.findByProps({ testID: 'period-month' }).props.onPress();
    });

    expect(selectedValue).toBe('month');
  });
});
