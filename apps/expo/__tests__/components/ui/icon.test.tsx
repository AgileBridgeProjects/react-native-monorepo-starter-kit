import { describe, expect, it, vi } from 'vitest';

import { Icon, IconSymbol } from '@/components/ui/icon';
import { iconSize } from '@/constants/tokens';
import { renderTree } from '@/test/utils/rtr';

// Render the real Icon, but stub the underlying IconSymbol so we assert the exact
// props Icon forwards rather than the platform-specific glyph component.
vi.mock('@/components/ui/icon-symbol', async () => {
  const React = await import('react');
  return {
    IconSymbol: (props: { name: string; size?: number; color: string; style?: unknown }) =>
      React.createElement('View', {
        testID: 'icon-symbol',
        'data-name': props.name,
        'data-size': props.size,
        'data-color': props.color,
        'data-style': props.style,
      }),
  };
});

describe('Icon', () => {
  it('re-exports IconSymbol', () => {
    expect(IconSymbol).toBeTruthy();
  });

  it('forwards name and explicit size/colour to IconSymbol', () => {
    const { root } = renderTree(<Icon name="house.fill" size={40} color="#abc" />);
    const symbol = root.findByProps({ testID: 'icon-symbol' });
    expect(symbol.props['data-name']).toBe('house.fill');
    expect(symbol.props['data-size']).toBe(40);
    expect(symbol.props['data-color']).toBe('#abc');
  });

  it('defaults size to iconSize.md when size is omitted', () => {
    const { root } = renderTree(<Icon name="star.fill" color="#000" />);
    const symbol = root.findByProps({ testID: 'icon-symbol' });
    expect(symbol.props['data-size']).toBe(iconSize.md);
  });

  it('passes through a custom style', () => {
    const style = { marginTop: 4 };
    const { root } = renderTree(<Icon name="bell.fill" color="#000" style={style} />);
    const symbol = root.findByProps({ testID: 'icon-symbol' });
    expect(symbol.props['data-style']).toBe(style);
  });

  it('matches the default snapshot', () => {
    const { toJSON } = renderTree(<Icon name="house.fill" color="#000" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
