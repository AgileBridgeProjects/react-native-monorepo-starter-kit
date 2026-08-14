import { describe, expect, it, vi } from 'vitest';
import { RatingSlider } from '@/components/ui/rating-slider';
import { TINT_INACTIVE } from '@/components/ui/rating-tint';
import { renderTree, type TestNode } from '@/test/utils/rtr';

vi.mock('@lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function adjustableNode(root: TestNode): TestNode {
  return root.find((node) => node.props.accessibilityRole === 'adjustable');
}

function fireAccessibilityAction(node: TestNode, actionName: 'increment' | 'decrement') {
  node.props.onAccessibilityAction({ nativeEvent: { actionName } });
}

describe('RatingSlider', () => {
  it('renders the unset state: dash readout and no announced value', () => {
    const root = renderTree(
      <RatingSlider value={null} min={1} max={10} onChange={vi.fn()} prompt="Energy?" />,
    ).root;

    const texts = root.findAll((node) => node.type === 'Text').flatMap((n) => n.props.children);
    expect(texts).toContain('–');
    expect(adjustableNode(root).props.accessibilityValue).toEqual({ min: 1, max: 10 });
  });

  it('lands the FIRST accessibility adjustment on min in both directions', () => {
    // Regression: increment-from-unset used to start at min + 1, making the
    // minimum value unreachable by increment for screen-reader users.
    const onChange = vi.fn();
    const root = renderTree(
      <RatingSlider value={null} min={1} max={10} onChange={onChange} />,
    ).root;

    fireAccessibilityAction(adjustableNode(root), 'increment');
    expect(onChange).toHaveBeenCalledWith(1);

    onChange.mockClear();
    fireAccessibilityAction(adjustableNode(root), 'decrement');
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('clamps accessibility adjustments at the bounds and drops no-op commits', () => {
    const onChange = vi.fn();
    const root = renderTree(<RatingSlider value={10} min={1} max={10} onChange={onChange} />).root;

    fireAccessibilityAction(adjustableNode(root), 'increment');
    expect(onChange).not.toHaveBeenCalled();

    fireAccessibilityAction(adjustableNode(root), 'decrement');
    expect(onChange).toHaveBeenCalledWith(9);
  });

  it('announces a clamped value when the stored rating exceeds the authored range', () => {
    const root = renderTree(<RatingSlider value={15} min={1} max={10} onChange={vi.fn()} />).root;

    expect(adjustableNode(root).props.accessibilityValue).toEqual({ min: 1, max: 10, now: 10 });
  });

  it('parks the shared tint channel on the inactive sentinel while unset', () => {
    const tintProgress = { value: 0.7 };
    renderTree(
      <RatingSlider
        value={null}
        min={1}
        max={10}
        onChange={vi.fn()}
        // biome-ignore lint/suspicious/noExplicitAny: the reanimated mock's shared values are plain objects
        tintProgress={tintProgress as any}
      />,
    );

    expect(tintProgress.value).toBe(TINT_INACTIVE);
  });
});
