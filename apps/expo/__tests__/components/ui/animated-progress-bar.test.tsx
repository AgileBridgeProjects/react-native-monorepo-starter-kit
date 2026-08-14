import { describe, expect, it } from 'vitest';

import { AnimatedProgressBar } from '@/components/ui/animated-progress-bar';
import { hostByTestId, renderTree } from '@/test/utils/rtr';

/**
 * Relies on the global react-native-reanimated mock from test/setup.ts:
 * useSharedValue → { value }, withTiming/withRepeat → identity, useAnimatedStyle → fn().
 * Animated.View resolves to the host string 'View'.
 */

function fillStyle(renderer: ReturnType<typeof renderTree>) {
  // The filled bar's style is the raw `useAnimatedStyle` object (not wrapped in an array) —
  // find the host node carrying a plain `{ width }` style, as opposed to the drift layer's
  // `[{ ...numeric width... }, driftStyle]` array.
  const filled = renderer.root.find(
    (n) =>
      typeof n.type === 'string' &&
      n.props.style != null &&
      typeof n.props.style === 'object' &&
      !Array.isArray(n.props.style) &&
      'width' in n.props.style,
  );
  return (filled.props.style as Record<string, unknown>).width as string;
}

describe('AnimatedProgressBar', () => {
  it('renders the track with progressbar accessibility semantics and fills to the given percentage', () => {
    const renderer = renderTree(<AnimatedProgressBar value={42} testID="bar" />);
    const track = hostByTestId(renderer.root, 'bar');

    expect(track).toBeTruthy();
    expect(track.props.accessibilityRole).toBe('progressbar');
    expect(track.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 });
    expect(fillStyle(renderer)).toBe('42%');
  });

  it('clamps values above 100 to a full bar', () => {
    const renderer = renderTree(<AnimatedProgressBar value={150} testID="bar" />);

    expect(fillStyle(renderer)).toBe('100%');
  });

  it('clamps negative values to an empty bar', () => {
    const renderer = renderTree(<AnimatedProgressBar value={-20} testID="bar" />);

    expect(fillStyle(renderer)).toBe('0%');
  });

  it('treats a non-finite value as zero', () => {
    const renderer = renderTree(<AnimatedProgressBar value={Number.NaN} testID="bar" />);

    expect(fillStyle(renderer)).toBe('0%');
  });

  it('defaults to the 24px pill height', () => {
    const renderer = renderTree(<AnimatedProgressBar value={50} testID="bar" />);
    const track = hostByTestId(renderer.root, 'bar');

    expect(track.props.style).toEqual({ height: 24 });
  });

  it('applies a custom height', () => {
    const renderer = renderTree(<AnimatedProgressBar value={50} testID="bar" height={8} />);
    const track = hostByTestId(renderer.root, 'bar');

    expect(track.props.style).toEqual({ height: 8 });
  });
});
