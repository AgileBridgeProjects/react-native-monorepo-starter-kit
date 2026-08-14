import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { StatBlock } from '@/components/ui/stat-block';
import { hostByTestId, renderTree, textChildren } from '@/test/utils/rtr';

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ name, color }: { name: string; color?: string }) => (
    <View testID={`icon-${name}`} accessibilityLabel={color} />
  ),
}));

describe('StatBlock', () => {
  it('renders the value, label and icon with an accessible summary label', () => {
    const renderer = renderTree(
      <StatBlock icon="trophy.fill" value={12} label="Games won" color="#22c55e" testID="stat" />,
    );

    const texts = textChildren(renderer.root);
    expect(texts).toContain('12');
    expect(texts).toContain('Games won');
    expect(hostByTestId(renderer.root, 'icon-trophy.fill')).toBeTruthy();

    const host = hostByTestId(renderer.root, 'stat');
    expect(host.props.accessibilityLabel).toBe('Games won: 12');
    expect(host.props.accessibilityRole).toBe('none');
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('stringifies a numeric value', () => {
    const renderer = renderTree(
      <StatBlock icon="star.fill" value={0} label="Streak" color="#f59e0b" testID="stat" />,
    );

    expect(textChildren(renderer.root)).toContain('0');
  });

  it('renders a string value verbatim', () => {
    const renderer = renderTree(
      <StatBlock icon="star.fill" value="98%" label="Accuracy" color="#3b82f6" testID="stat" />,
    );

    expect(textChildren(renderer.root)).toContain('98%');
    expect(hostByTestId(renderer.root, 'stat').props.accessibilityLabel).toBe('Accuracy: 98%');
  });

  it('uses the default surface background when no cardColor is given', () => {
    const renderer = renderTree(
      <StatBlock icon="star.fill" value={1} label="Streak" color="#f59e0b" testID="stat" />,
    );
    const host = hostByTestId(renderer.root, 'stat');

    expect(host.props.className).toContain('bg-surface');
    expect(host.props.style).toBeUndefined();
  });

  it('applies a tinted card background when cardColor is provided', () => {
    const renderer = renderTree(
      <StatBlock
        icon="star.fill"
        value={1}
        label="Streak"
        color="#f59e0b"
        cardColor="#ff0000"
        testID="stat"
      />,
    );
    const host = hostByTestId(renderer.root, 'stat');

    expect(host.props.style).toEqual({ backgroundColor: '#ff000018' });
    expect(host.props.className).not.toContain('bg-surface');
  });

  it('merges extra className overrides', () => {
    const renderer = renderTree(
      <StatBlock
        icon="star.fill"
        value={1}
        label="Streak"
        color="#f59e0b"
        className="w-32"
        testID="stat"
      />,
    );

    expect(hostByTestId(renderer.root, 'stat').props.className).toContain('w-32');
  });
});
