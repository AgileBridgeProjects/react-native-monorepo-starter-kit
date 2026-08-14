import { describe, expect, it } from 'vitest';

import { ProgressBar } from '@/components/ui/progress-bar';
import { hostByTestId, renderTree } from '@/test/utils/rtr';

/**
 * Relies on the global react-native-reanimated mock from test/setup.ts:
 * useSharedValue → { value }, withSpring → identity, useAnimatedStyle → fn().
 * Animated.View resolves to the host string 'View'.
 */

function fillStyle(renderer: ReturnType<typeof renderTree>) {
  // The filled bar is the inner animated view carrying the width style.
  const filled = renderer.root.find(
    (n) =>
      typeof n.type === 'string' &&
      Array.isArray(n.props.style) &&
      n.props.style.some((s: unknown) => s && typeof s === 'object' && 'width' in (s as object)),
  );
  const widthStyle = (filled.props.style as Array<Record<string, unknown>>).find(
    (s) => s && 'width' in s,
  );
  return widthStyle?.width as string;
}

describe('ProgressBar', () => {
  it('renders the track and fills to the given percentage', () => {
    const renderer = renderTree(<ProgressBar value={42} testID="bar" />);

    expect(hostByTestId(renderer.root, 'bar')).toBeTruthy();
    expect(fillStyle(renderer)).toBe('42%');
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('clamps values above 100 to a full bar', () => {
    const renderer = renderTree(<ProgressBar value={150} testID="bar" />);

    expect(fillStyle(renderer)).toBe('100%');
  });

  it('clamps negative values to an empty bar', () => {
    const renderer = renderTree(<ProgressBar value={-20} testID="bar" />);

    expect(fillStyle(renderer)).toBe('0%');
  });

  it('treats a non-finite value as zero', () => {
    const renderer = renderTree(<ProgressBar value={Number.NaN} testID="bar" />);

    expect(fillStyle(renderer)).toBe('0%');
  });

  it('uses the default bg-border track and bg-accent fill when no colours are given', () => {
    const renderer = renderTree(<ProgressBar value={50} testID="bar" />);
    const track = hostByTestId(renderer.root, 'bar');

    expect(track.props.className).toContain('bg-border');
    expect(track.props.style).toBeUndefined();
  });

  it('applies custom track and background colours', () => {
    const renderer = renderTree(
      <ProgressBar value={50} testID="bar" trackColor="#ff0000" backgroundColor="#00ff00" />,
    );
    const track = hostByTestId(renderer.root, 'bar');

    expect(track.props.style).toEqual({ backgroundColor: '#00ff00' });
    // Custom backgroundColor suppresses the default bg-border class.
    expect(track.props.className).not.toContain('bg-border');

    const filled = renderer.root.find(
      (n) =>
        typeof n.type === 'string' &&
        Array.isArray(n.props.style) &&
        n.props.style.some(
          (s: unknown) => s && typeof s === 'object' && 'backgroundColor' in (s as object),
        ),
    );
    expect(filled.props.className).not.toContain('bg-accent');
  });

  it('merges extra className onto the track', () => {
    const renderer = renderTree(<ProgressBar value={50} testID="bar" className="h-3" />);

    expect(hostByTestId(renderer.root, 'bar').props.className).toContain('h-3');
  });
});
