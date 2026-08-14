import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { StatusChip } from '@/components/ui/status-chip';
import { hostByTestId, queryAllByTestId, renderTree, textChildren } from '@/test/utils/rtr';

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ name, color }: { name: string; color?: string }) => (
    <View testID={`icon-${name}`} accessibilityLabel={color} />
  ),
}));

describe('StatusChip', () => {
  it('renders the label text', () => {
    const renderer = renderTree(<StatusChip label="New" testID="chip" />);

    expect(textChildren(renderer.root)).toContain('New');
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('does not render an icon when iconName is omitted', () => {
    const renderer = renderTree(<StatusChip label="Passed" testID="chip" />);

    expect(queryAllByTestId(renderer.root, 'icon-checkmark')).toHaveLength(0);
  });

  it('renders the icon (in white) when iconName is provided', () => {
    const renderer = renderTree(<StatusChip label="Mastered" iconName="star.fill" testID="chip" />);
    const icon = hostByTestId(renderer.root, 'icon-star.fill');

    expect(icon.props.accessibilityLabel).toBe('white');
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('applies the container background class', () => {
    const renderer = renderTree(
      <StatusChip label="New" containerClassName="bg-accent" testID="chip" />,
    );

    expect(hostByTestId(renderer.root, 'chip').props.className).toContain('bg-accent');
    expect(hostByTestId(renderer.root, 'chip').props.className).toContain('rounded-full');
  });

  it('exposes accessibility label and accessible flag when provided', () => {
    const renderer = renderTree(
      <StatusChip label="New" testID="chip" accessible accessibilityLabel="Status: new" />,
    );
    const host = hostByTestId(renderer.root, 'chip');

    expect(host.props.accessible).toBeTruthy();
    expect(host.props.accessibilityLabel).toBe('Status: new');
  });
});
