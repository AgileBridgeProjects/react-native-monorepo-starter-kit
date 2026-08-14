import type React from 'react';
import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { PeriodSwitcher } from '@/components/ui/period-switcher';
import { firePress, hostByTestId, renderTree, textChildren } from '@/test/utils/rtr';

vi.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ name }: { name: string }) => <View testID={`icon-${name}`} />,
}));

function baseProps(overrides: Partial<React.ComponentProps<typeof PeriodSwitcher>> = {}) {
  return {
    label: 'June 2026',
    onPreviousPress: vi.fn(),
    onNextPress: vi.fn(),
    previousLabel: 'Previous period',
    nextLabel: 'Next period',
    ...overrides,
  };
}

describe('PeriodSwitcher', () => {
  it('renders the label and both chevron buttons', () => {
    const renderer = renderTree(<PeriodSwitcher {...baseProps()} />);

    expect(textChildren(renderer.root)).toContain('June 2026');
    expect(hostByTestId(renderer.root, 'icon-chevron.left')).toBeTruthy();
    expect(hostByTestId(renderer.root, 'icon-chevron.right')).toBeTruthy();
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('exposes accessibility labels and button roles on both controls', () => {
    const renderer = renderTree(<PeriodSwitcher {...baseProps()} />);
    const buttons = renderer.root.findAll(
      (n) => n.type === 'Pressable' && n.props.accessibilityRole === 'button',
    );

    const labels = buttons.map((b) => b.props.accessibilityLabel);
    expect(labels).toContain('Previous period');
    expect(labels).toContain('Next period');
  });

  it('fires onPreviousPress when the left chevron is pressed', async () => {
    const onPreviousPress = vi.fn();
    const renderer = renderTree(<PeriodSwitcher {...baseProps({ onPreviousPress })} />);
    const prev = renderer.root.find(
      (n) => n.type === 'Pressable' && n.props.accessibilityLabel === 'Previous period',
    );

    await firePress(prev);

    expect(onPreviousPress).toHaveBeenCalledTimes(1);
  });

  it('fires onNextPress when the right chevron is pressed', async () => {
    const onNextPress = vi.fn();
    const renderer = renderTree(<PeriodSwitcher {...baseProps({ onNextPress })} />);
    const next = renderer.root.find(
      (n) => n.type === 'Pressable' && n.props.accessibilityLabel === 'Next period',
    );

    await firePress(next);

    expect(onNextPress).toHaveBeenCalledTimes(1);
  });
});
