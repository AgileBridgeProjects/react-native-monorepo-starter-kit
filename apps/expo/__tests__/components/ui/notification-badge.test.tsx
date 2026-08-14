import { describe, expect, it } from 'vitest';

import { NotificationBadge } from '@/components/ui/notification-badge';
import { renderTree, textChildren } from '@/test/utils/rtr';

describe('NotificationBadge', () => {
  it('renders nothing when the count is zero', () => {
    const { toJSON } = renderTree(<NotificationBadge count={0} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing for negative counts', () => {
    const { toJSON } = renderTree(<NotificationBadge count={-3} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the exact count for single-digit values', () => {
    const { root } = renderTree(<NotificationBadge count={1} />);
    expect(textChildren(root)).toContain('1');
  });

  it('renders the exact count at the nine boundary', () => {
    const { root } = renderTree(<NotificationBadge count={9} />);
    expect(textChildren(root)).toContain('9');
  });

  it('caps the count at 9+ once it exceeds nine', () => {
    const { root } = renderTree(<NotificationBadge count={10} />);
    const text = textChildren(root);
    expect(text).toContain('9+');
    expect(text).not.toContain('10');
  });

  it('caps very large counts at 9+', () => {
    const { root } = renderTree(<NotificationBadge count={250} />);
    expect(textChildren(root)).toContain('9+');
  });

  it('applies the default top-right positioning when no className is given', () => {
    const { root } = renderTree(<NotificationBadge count={2} />);
    const badge = root.findAll((n) => n.type === 'View')[0];
    expect(badge.props.className).toContain('-right-1.5');
    expect(badge.props.className).toContain('-top-1');
    expect(badge.props.className).toContain('bg-error');
  });

  it('overrides positioning when a custom className is provided', () => {
    const { root } = renderTree(<NotificationBadge count={2} className="top-0 right-0" />);
    const badge = root.findAll((n) => n.type === 'View')[0];
    expect(badge.props.className).toContain('top-0');
    expect(badge.props.className).toContain('right-0');
    expect(badge.props.className).not.toContain('-right-1.5');
  });

  it('matches the single-digit snapshot', () => {
    const { toJSON } = renderTree(<NotificationBadge count={3} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the capped 9+ snapshot', () => {
    const { toJSON } = renderTree(<NotificationBadge count={42} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
