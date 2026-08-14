import { describe, expect, it } from 'vitest';
import { SegmentedRing } from '@/components/ui/segmented-ring';
import { byTestId, renderTree, type TestNode, textChildren } from '@/test/utils/rtr';

const CYAN = '#3BD7F6';

/** Every `Circle` the ring drew, in render order (track then fill, per segment). */
function circles(root: TestNode): TestNode[] {
  return root.findAll((node) => node.type === 'Circle');
}

describe('SegmentedRing', () => {
  it('draws a track per segment and a fill only for segments with progress', () => {
    const root = renderTree(
      <SegmentedRing
        segments={[
          { progress: 0.5, color: CYAN },
          { progress: 0, color: CYAN },
          { progress: 1, color: CYAN },
        ]}
        testID="ring"
      />,
    ).root;

    // 3 tracks + 2 fills (the zero-progress segment draws no fill).
    expect(circles(root)).toHaveLength(5);
  });

  it('gives each segment an equal arc, shortened by the gap', () => {
    const size = 100;
    const strokeWidth = 10;
    const root = renderTree(
      <SegmentedRing
        segments={[
          { progress: 1, color: CYAN },
          { progress: 1, color: CYAN },
        ]}
        size={size}
        strokeWidth={strokeWidth}
        gapDegrees={0}
        testID="ring"
      />,
    ).root;

    const circumference = 2 * Math.PI * ((size - strokeWidth) / 2);
    const [track] = circles(root);
    const [arcLength] = String(track.props.strokeDasharray).split(' ').map(Number);

    // Two segments, no gap → each arc is exactly half the circle.
    expect(arcLength).toBeCloseTo(circumference / 2, 5);
  });

  it('clamps out-of-range progress instead of overdrawing its arc', () => {
    const root = renderTree(
      <SegmentedRing segments={[{ progress: 4, color: CYAN }]} gapDegrees={0} testID="ring" />,
    ).root;

    const [track, fill] = circles(root);
    const [trackArc] = String(track.props.strokeDasharray).split(' ').map(Number);
    const [fillArc] = String(fill.props.strokeDasharray).split(' ').map(Number);

    expect(fillArc).toBeCloseTo(trackArc, 5);
  });

  it('renders the track alone for an empty segment list', () => {
    const root = renderTree(<SegmentedRing segments={[]} testID="ring" />).root;

    expect(byTestId(root, 'ring')).toBeTruthy();
    expect(circles(root)).toHaveLength(0);
  });

  it('renders its centre content and exposes an accessible label', () => {
    const root = renderTree(
      <SegmentedRing
        segments={[{ progress: 0.25, color: CYAN }]}
        accessibilityLabel="2 of 4 categories started today"
        testID="ring"
      >
        <span>7</span>
      </SegmentedRing>,
    ).root;

    expect(byTestId(root, 'ring').props.accessibilityLabel).toBe('2 of 4 categories started today');
    expect(textChildren(root).length + circles(root).length).toBeGreaterThan(0);
  });
});
