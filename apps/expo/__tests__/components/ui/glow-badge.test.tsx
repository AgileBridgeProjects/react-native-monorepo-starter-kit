import { describe, expect, it } from 'vitest';
import { GlowBadge } from '@/components/ui/glow-badge';
import { TapHint } from '@/components/ui/tap-hint';
import { byTestId, renderTree, textChildren } from '@/test/utils/rtr';

describe('GlowBadge', () => {
  it('renders the icon inside a halo-and-circle pair', () => {
    const root = renderTree(
      <GlowBadge
        icon="checkmark"
        iconColor="#fff"
        circleClassName="bg-success/20"
        testID="badge"
      />,
    ).root;

    const badge = byTestId(root, 'badge');
    const circles = badge.findAll(
      (node) =>
        typeof node.props.className === 'string' && node.props.className.includes('rounded-full'),
    );
    expect(circles.length).toBeGreaterThanOrEqual(2);
  });
});

describe('TapHint', () => {
  it('renders its label', () => {
    const root = renderTree(<TapHint label="Tap to continue" />).root;

    expect(textChildren(root)).toContain('Tap to continue');
    expect(root.find((node) => node.props.style?.opacity !== undefined).props.style.opacity).toBe(
      0.72,
    );
  });
});
