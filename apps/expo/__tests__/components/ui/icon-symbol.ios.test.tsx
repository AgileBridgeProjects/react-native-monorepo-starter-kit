import { describe, expect, it } from 'vitest';

import { IconSymbol } from '@/components/ui/icon-symbol.ios';
import { iconSize } from '@/constants/tokens';
import { renderTree, type TestNode } from '@/test/utils/rtr';

// expo-symbols' SymbolView is mocked globally in test/setup.ts as the string
// 'SymbolView', so it renders as a host node carrying the SF Symbol props.
const symbol = (root: TestNode): TestNode => root.find((n) => n.type === 'SymbolView');

describe('IconSymbol (iOS SF Symbols)', () => {
  it('renders a SymbolView with the SF Symbol name', () => {
    const { root } = renderTree(<IconSymbol name="house.fill" color="#111" />);
    expect(symbol(root).props.name).toBe('house.fill');
  });

  it('passes the colour through as tintColor', () => {
    const { root } = renderTree(<IconSymbol name="house.fill" color="#abc" />);
    expect(symbol(root).props.tintColor).toBe('#abc');
  });

  it('uses scaleAspectFit resize mode', () => {
    const { root } = renderTree(<IconSymbol name="house.fill" color="#111" />);
    expect(symbol(root).props.resizeMode).toBe('scaleAspectFit');
  });

  it('defaults the weight to regular', () => {
    const { root } = renderTree(<IconSymbol name="house.fill" color="#111" />);
    expect(symbol(root).props.weight).toBe('regular');
  });

  it('forwards an explicit weight', () => {
    const { root } = renderTree(<IconSymbol name="house.fill" color="#111" weight="bold" />);
    expect(symbol(root).props.weight).toBe('bold');
  });

  it('sizes the symbol via width/height from the size prop', () => {
    const { root } = renderTree(<IconSymbol name="house.fill" color="#111" size={50} />);
    const style = symbol(root).props.style as Array<Record<string, unknown> | undefined>;
    expect(style[0]).toEqual({ width: 50, height: 50 });
  });

  it('defaults the size to iconSize.md', () => {
    const { root } = renderTree(<IconSymbol name="house.fill" color="#111" />);
    const style = symbol(root).props.style as Array<Record<string, unknown> | undefined>;
    expect(style[0]).toEqual({ width: iconSize.md, height: iconSize.md });
  });

  it('appends a custom style', () => {
    const custom = { opacity: 0.3 };
    const { root } = renderTree(<IconSymbol name="house.fill" color="#111" style={custom} />);
    const style = symbol(root).props.style as Array<Record<string, unknown> | undefined>;
    expect(style[1]).toBe(custom);
  });

  it('matches the default snapshot', () => {
    const { toJSON } = renderTree(<IconSymbol name="house.fill" color="#111" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
