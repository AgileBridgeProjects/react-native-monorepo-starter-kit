import { afterEach, describe, expect, it, vi } from 'vitest';

import { MotionLinesBackground } from '@/components/ui/motion-lines-background';
import { renderTree, type TestNode } from '@/test/utils/rtr';

// The reanimated mock renders Animated.View as the host string 'View', so the lines
// are not distinguishable by type. Identify them by their absolute-positioned style
// with a backgroundColor (the wrapper layer has neither).
const lineNodes = (root: TestNode): TestNode[] =>
  root.findAll((n) => {
    const style = n.props.style as Array<Record<string, unknown>> | undefined;
    return (
      Array.isArray(style) && style[0]?.position === 'absolute' && 'backgroundColor' in style[0]
    );
  });

const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => motion.reduced,
}));

afterEach(() => {
  motion.reduced = false;
});

// 14 primary lines + 13 secondary lines defined in the source.
const PRIMARY = 14;
const SECONDARY = 13;

describe('MotionLinesBackground', () => {
  it('renders one animated line per primary config when no secondary colour is given', () => {
    const { root } = renderTree(<MotionLinesBackground color="#fff" />);
    expect(lineNodes(root)).toHaveLength(PRIMARY);
  });

  it('adds the secondary layer when a secondaryColor is provided', () => {
    const { root } = renderTree(<MotionLinesBackground color="#fff" secondaryColor="#abc" />);
    expect(lineNodes(root)).toHaveLength(PRIMARY + SECONDARY);
  });

  it('applies the supplied colours as line backgrounds', () => {
    const { root } = renderTree(<MotionLinesBackground color="#aaa" secondaryColor="#bbb" />);
    const colours = lineNodes(root).map((n) => {
      const style = n.props.style as Array<Record<string, unknown>>;
      return style[0].backgroundColor;
    });
    expect(colours).toContain('#aaa');
    expect(colours).toContain('#bbb');
  });

  it('wraps the lines in a non-interactive absolute-fill layer', () => {
    const { root } = renderTree(<MotionLinesBackground color="#fff" />);
    const layer = root.find((n) => n.type === 'View');
    expect(layer.props.pointerEvents).toBe('none');
  });

  it('renders nothing when reduced motion is enabled', () => {
    motion.reduced = true;
    const { root, toJSON } = renderTree(
      <MotionLinesBackground color="#fff" secondaryColor="#abc" />,
    );
    expect(lineNodes(root)).toHaveLength(0);
    expect(toJSON()).toBeNull();
  });

  it('matches the default snapshot', () => {
    const { toJSON } = renderTree(<MotionLinesBackground color="#fff" />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the two-layer snapshot', () => {
    const { toJSON } = renderTree(<MotionLinesBackground color="#fff" secondaryColor="#abc" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
