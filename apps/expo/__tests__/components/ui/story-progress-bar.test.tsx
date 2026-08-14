import { describe, expect, it } from 'vitest';
import { StoryProgressBar } from '@/components/ui/story-progress-bar';
import { byTestId, renderTree } from '@/test/utils/rtr';

describe('StoryProgressBar', () => {
  it('renders one segment per step', () => {
    const root = renderTree(<StoryProgressBar total={5} current={2} testID="bar" />).root;

    const bar = byTestId(root, 'bar');
    // Each segment is a track View with an animated fill inside.
    const tracks = bar.findAll(
      (node) =>
        typeof node.type === 'string' &&
        node.type === 'View' &&
        typeof node.props.className === 'string' &&
        node.props.className.includes('overflow-hidden'),
    );
    expect(tracks).toHaveLength(5);
  });

  it('fills past and current segments, leaves upcoming empty', () => {
    const root = renderTree(<StoryProgressBar total={3} current={1} testID="bar" />).root;

    const fills = byTestId(root, 'bar').findAll(
      (node) =>
        typeof node.props.style === 'object' &&
        node.props.style !== null &&
        'width' in (node.props.style as Record<string, unknown>),
    );
    const widths = fills.map((node) => (node.props.style as { width: string }).width);
    // done, current, upcoming. The current segment reads 0% here because its
    // fill is a mount-time sweep animation, and the mock evaluates animated
    // styles once at render (before the effect that starts the sweep).
    expect(widths).toEqual(['100%', '0%', '0%']);
  });
});
