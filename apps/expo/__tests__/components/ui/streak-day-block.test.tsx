import type React from 'react';
import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { BLOCK_HEIGHT, DayBlock, type DayCell } from '@/components/ui/streak-day-block';
import { renderTree, type TestNode, textChildren } from '@/test/utils/rtr';

const reducedMotion = vi.hoisted(() => ({ value: true }));

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => reducedMotion.value,
}));

// Local reanimated mock with interpolate (the global mock omits it).
vi.mock('react-native-reanimated', () => {
  const passthrough = (v: unknown) => v;
  return {
    default: {
      createAnimatedComponent: (c: React.ComponentType) => c,
      View,
    },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => object) => fn(),
    interpolate: (value: number, _input: number[], output: number[]) => output[0] ?? value,
    withTiming: passthrough,
    withDelay: (_d: unknown, anim: unknown) => anim,
    withSequence: (...a: unknown[]) => a[a.length - 1],
    withSpring: passthrough,
    cancelAnimation: () => {},
    Easing: { out: () => 0, cubic: 0, bezier: () => 0 },
  };
});

vi.mock('@/components/ui/icon', async () => {
  const React = await import('react');
  return {
    Icon: ({ name }: { name: string }) => React.createElement('View', { testID: `icon-${name}` }),
  };
});

vi.mock('@/components/ui/typography', async () => {
  const React = await import('react');
  return {
    Typography: ({ children, style }: { children?: React.ReactNode; style?: unknown }) =>
      React.createElement('Text', { style }, children),
  };
});

const colors = {
  accent: '#f97316',
  blockFill: '#eeeeee',
  missedFill: '#dddddd',
  onAccent: '#ffffff',
  subtle: '#999999',
  muted: '#aaaaaa',
};

const burstColors = ['#ff0000', '#00ff00', '#0000ff'] as const;

function makeDay(overrides: Partial<DayCell> = {}): DayCell {
  return {
    date: '2026-06-10',
    active: false,
    label: 'Wed',
    isToday: false,
    isPast: false,
    ...overrides,
  };
}

function render(day: DayCell, celebrateTick = 0) {
  return renderTree(
    <DayBlock
      day={day}
      dailyXp={75}
      c={colors}
      xpLabel="XP"
      celebrateTick={celebrateTick}
      burstColors={burstColors}
    />,
  );
}

const blockView = (root: TestNode): TestNode =>
  root.findAll((n) => n.type === 'View').find((v) => v.props.style?.height === BLOCK_HEIGHT) ??
  root.findAll((n) => n.type === 'View')[0];

describe('DayBlock', () => {
  it('always renders the day label', () => {
    const { root } = render(makeDay({ label: 'Mon' }));
    expect(textChildren(root)).toContain('Mon');
  });

  it('shows a checkmark and the accent fill for an active day', () => {
    const { root } = render(makeDay({ active: true }));
    expect(root.findAll((n) => n.props.testID === 'icon-checkmark.circle.fill')).toHaveLength(1);
    expect(blockView(root).props.style.backgroundColor).toBe(colors.accent);
  });

  it('renders the daily XP for an upcoming (future, inactive) day', () => {
    const { root } = render(makeDay({ active: false, isPast: false }));
    expect(textChildren(root)).toContain('75');
    expect(textChildren(root)).toContain('XP');
    expect(root.findAll((n) => n.props.testID === 'icon-checkmark.circle.fill')).toHaveLength(0);
  });

  it('renders an empty missed block for a past inactive day', () => {
    const { root } = render(makeDay({ active: false, isPast: true }));
    expect(textChildren(root)).not.toContain('75');
    expect(blockView(root).props.style.backgroundColor).toBe(colors.missedFill);
  });

  it('draws a today ring on an inactive current day', () => {
    const { root } = render(makeDay({ isToday: true, active: false }));
    const block = blockView(root);
    expect(block.props.style.borderWidth).toBe(2);
    expect(block.props.style.borderColor).toBe(colors.accent);
  });

  it('does not draw a today ring once the current day is active', () => {
    const { root } = render(makeDay({ isToday: true, active: true }));
    expect(blockView(root).props.style.borderWidth).toBeUndefined();
  });

  it('suppresses the confetti burst while reduced motion is on', () => {
    reducedMotion.value = true;
    const { root } = render(makeDay({ active: true }), 1);
    // Burst particles are absolutely-positioned animated views; with reduced
    // motion the ConfettiBurst is never mounted.
    expect(root.findAll((n) => n.props.style?.borderRadius === 2)).toHaveLength(0);
  });

  it('matches the active-day snapshot', () => {
    const { toJSON } = render(makeDay({ active: true }));
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the upcoming-day snapshot', () => {
    const { toJSON } = render(makeDay({ active: false, isPast: false }));
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the past-missed-day snapshot', () => {
    const { toJSON } = render(makeDay({ active: false, isPast: true }));
    expect(toJSON()).toMatchSnapshot();
  });
});
