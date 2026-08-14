import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { DonutStat } from '@/components/ui/donut-stat';
import { hostByTestId, queryAllByTestId, renderTree, textChildren } from '@/test/utils/rtr';

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ name }: { name: string }) => <View testID={`icon-${name}`} />,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <View testID="skeleton" accessibilityLabel={className} />
  ),
}));

describe('DonutStat', () => {
  it('renders the ring, value, label and a fraction accessibility label', () => {
    const renderer = renderTree(
      <DonutStat value={3} total={10} label="Games won" color="#22c55e" testID="donut" />,
    );

    const texts = textChildren(renderer.root);
    expect(texts).toContain('3');
    expect(texts).toContain('Games won');

    const host = hostByTestId(renderer.root, 'donut');
    expect(host.props.accessibilityLabel).toBe('Games won: 3/10');
    expect(host.props.accessible).toBeTruthy();

    // Two circles: track + progress arc.
    expect(renderer.root.findAllByType('Circle')).toHaveLength(2);
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('omits the progress arc when the fraction is zero', () => {
    const renderer = renderTree(
      <DonutStat value={0} total={10} label="Games won" color="#22c55e" testID="donut" />,
    );

    // Only the background track circle renders.
    expect(renderer.root.findAllByType('Circle')).toHaveLength(1);
  });

  it('treats a missing/zero total as no progress', () => {
    const renderer = renderTree(
      <DonutStat value={5} label="Games won" color="#22c55e" testID="donut" />,
    );

    expect(renderer.root.findAllByType('Circle')).toHaveLength(1);
    // total undefined → label shows `value/undefined`.
    expect(hostByTestId(renderer.root, 'donut').props.accessibilityLabel).toBe(
      'Games won: 5/undefined',
    );
  });

  it('renders the plain KPI (no ring) with optional icon when hideRing is set', () => {
    const renderer = renderTree(
      <DonutStat
        value={42}
        label="Total XP"
        color="#6d28d9"
        hideRing
        icon="bolt.fill"
        testID="donut"
      />,
    );

    expect(renderer.root.findAllByType('Circle')).toHaveLength(0);
    expect(hostByTestId(renderer.root, 'icon-bolt.fill')).toBeTruthy();
    expect(hostByTestId(renderer.root, 'donut').props.accessibilityLabel).toBe('Total XP: 42');
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('shows a skeleton instead of the value while loading', () => {
    const renderer = renderTree(
      <DonutStat value={3} total={10} label="Games won" color="#22c55e" isLoading testID="donut" />,
    );

    expect(queryAllByTestId(renderer.root, 'skeleton')).toHaveLength(1);
    expect(textChildren(renderer.root)).not.toContain('3');
    // Loading suppresses the progress arc.
    expect(renderer.root.findAllByType('Circle')).toHaveLength(1);
  });

  it('overrides the hero number with centerText when provided', () => {
    const renderer = renderTree(
      <DonutStat
        value={3}
        total={10}
        centerText="30%"
        label="Win rate"
        color="#22c55e"
        testID="donut"
      />,
    );

    expect(textChildren(renderer.root)).toContain('30%');
    expect(textChildren(renderer.root)).not.toContain('3');
  });

  it('renders the optional sub-label', () => {
    const renderer = renderTree(
      <DonutStat
        value={3}
        total={10}
        subLabel="of 10"
        label="Games won"
        color="#22c55e"
        testID="donut"
      />,
    );

    expect(textChildren(renderer.root)).toContain('of 10');
  });

  it('clamps an over-total value so the arc never exceeds the circle', () => {
    const renderer = renderTree(
      <DonutStat value={20} total={10} label="Games won" color="#22c55e" testID="donut" />,
    );
    // fraction is clamped to 1 → strokeDashoffset 0 on the progress circle.
    const progressArc = renderer.root.findAllByType('Circle')[1];

    expect(progressArc.props.strokeDashoffset).toBe(0);
  });

  it('applies a tinted card background when cardColor is provided', () => {
    const renderer = renderTree(
      <DonutStat
        value={3}
        total={10}
        label="Games won"
        color="#22c55e"
        cardColor="#ff0000"
        testID="donut"
      />,
    );
    const host = hostByTestId(renderer.root, 'donut');

    expect(host.props.style).toEqual({ backgroundColor: '#ff000018' });
    expect(host.props.className).not.toContain('bg-surface');
  });
});
