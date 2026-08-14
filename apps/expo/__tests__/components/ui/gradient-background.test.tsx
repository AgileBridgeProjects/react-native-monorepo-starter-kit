import { Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { GradientBackground, SCREEN_GRADIENT } from '@/components/ui/gradient-background';
import { hostByTestId, renderTree, textChildren } from '@/test/utils/rtr';

vi.mock('@/constants/tokens', () => ({
  palette: { gradient: { start: '#a', mid: '#b', end: '#c' } },
}));

// SCREEN_GRADIENT is still exported for the auth surfaces (sign-in hero, splash,
// OAuth overlay), which keep the diagonal brand gradient — see the identity split design pass.
describe('SCREEN_GRADIENT', () => {
  it('sweeps top-right to bottom-left (Figma "Dark background" diagonal)', () => {
    expect(SCREEN_GRADIENT.start).toEqual({ x: 1, y: 0 });
    expect(SCREEN_GRADIENT.end).toEqual({ x: 0, y: 1 });
  });

  it('uses the three shared gradient stops in order', () => {
    expect(SCREEN_GRADIENT.colors).toEqual(['#a', '#b', '#c']);
  });
});

describe('GradientBackground', () => {
  it('renders a solid navy backdrop rather than a gradient', () => {
    const root = renderTree(<GradientBackground testID="bg" />).root;

    expect(root.findAllByType('LinearGradient')).toHaveLength(0);
    expect(hostByTestId(root, 'bg').props.className).toContain('bg-brand-blue-screen');
  });

  it('defaults to flex-1 so it fills its parent', () => {
    const root = renderTree(<GradientBackground testID="bg" />).root;
    expect(hostByTestId(root, 'bg').props.className).toContain('flex-1');
  });

  it('merges extra classes with the flex-1 default', () => {
    const root = renderTree(<GradientBackground testID="bg" className="rounded-xl" />).root;
    const { className } = hostByTestId(root, 'bg').props;
    expect(className).toContain('flex-1');
    expect(className).toContain('rounded-xl');
  });

  it('renders children on top of the backdrop', () => {
    const root = renderTree(
      <GradientBackground testID="bg">
        <Text>Hello</Text>
      </GradientBackground>,
    ).root;
    expect(textChildren(root)).toContain('Hello');
  });

  it('forwards testID and style to the underlying view', () => {
    const root = renderTree(<GradientBackground testID="bg" style={{ opacity: 0.5 }} />).root;
    const view = hostByTestId(root, 'bg');
    expect(view.props.testID).toBe('bg');
    expect(view.props.style).toEqual([{ flex: 1 }, { opacity: 0.5 }]);
  });

  it('applies an explicit flex: 1 style so the backdrop fills the screen on native', () => {
    // className alone doesn't reliably resolve to a real flex layout for a
    // full-bleed root view on iOS (confirmed on-device) — this must stay a real
    // style, not just a className, or it shrink-wraps to content height and the
    // rest of the screen shows through as white.
    const root = renderTree(<GradientBackground testID="bg" />).root;
    expect(hostByTestId(root, 'bg').props.style).toEqual([{ flex: 1 }, undefined]);
  });
});
