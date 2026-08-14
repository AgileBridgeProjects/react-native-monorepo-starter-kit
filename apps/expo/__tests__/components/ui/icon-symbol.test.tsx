import { Platform } from 'react-native';
import { afterEach, describe, expect, it } from 'vitest';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { iconSize } from '@/constants/tokens';
import { renderTree, type TestNode } from '@/test/utils/rtr';

// The vector-icon glyph components are aliased to a shared host-string mock in the
// vitest config, so MaterialIcons and MaterialCommunityIcons render as the SAME host
// type. We therefore assert behaviour via the rendered `name` prop (the SF-Symbol →
// Material mapping), which is the meaningful contract here, rather than the element type.
const glyph = (root: TestNode): TestNode =>
  root.find((n) => typeof n.props.name === 'string' && 'color' in n.props && 'size' in n.props);

type SymName = Parameters<typeof IconSymbol>[0]['name'];

function setOS(os: 'ios' | 'android' | 'web') {
  (Platform as { OS: string }).OS = os;
}

afterEach(() => setOS('ios'));

describe('IconSymbol (native/android fallback)', () => {
  it('maps a filled SF Symbol name to its Material Icon name', () => {
    const { root } = renderTree(<IconSymbol name="house.fill" color="#111" />);
    expect(glyph(root).props.name).toBe('home');
  });

  it('maps several representative filled names correctly', () => {
    const cases: Array<[SymName, string]> = [
      ['paperplane.fill', 'send'],
      ['chevron.right', 'chevron-right'],
      ['trophy.fill', 'emoji-events'],
      ['rectangle.portrait.and.arrow.right', 'logout'],
      ['line.3.horizontal', 'menu'],
    ];
    for (const [name, expected] of cases) {
      const { root } = renderTree(<IconSymbol name={name} color="#111" />);
      expect(glyph(root).props.name).toBe(expected);
    }
  });

  it('uses the community (outline) mapping for inactive variants', () => {
    const { root } = renderTree(<IconSymbol name="house" color="#111" />);
    expect(glyph(root).props.name).toBe('home-outline');
  });

  it('community mapping takes precedence — gamecontroller.fill resolves to the gamepad glyph', () => {
    const { root } = renderTree(<IconSymbol name="gamecontroller.fill" color="#111" />);
    expect(glyph(root).props.name).toBe('gamepad-variant');
  });

  it('falls back to the help-outline glyph for an unknown name', () => {
    const { root } = renderTree(<IconSymbol name={'totally.unknown' as SymName} color="#111" />);
    expect(glyph(root).props.name).toBe('help-outline');
  });

  it('forwards colour and explicit size', () => {
    const { root } = renderTree(<IconSymbol name="star.fill" color="#f00" size={48} />);
    const node = glyph(root);
    expect(node.props.color).toBe('#f00');
    expect(node.props.size).toBe(48);
  });

  it('defaults size to iconSize.md', () => {
    const { root } = renderTree(<IconSymbol name="star.fill" color="#f00" />);
    expect(glyph(root).props.size).toBe(iconSize.md);
  });

  it('omits includeFontPadding on iOS', () => {
    setOS('ios');
    const { root } = renderTree(<IconSymbol name="star.fill" color="#f00" />);
    const style = glyph(root).props.style as Array<Record<string, unknown> | undefined>;
    expect(style[0]).toEqual({});
  });

  it('disables includeFontPadding on Android to fix glyph alignment', () => {
    setOS('android');
    const { root } = renderTree(<IconSymbol name="star.fill" color="#f00" />);
    const style = glyph(root).props.style as Array<Record<string, unknown> | undefined>;
    expect(style[0]).toEqual({ includeFontPadding: false });
  });

  it('passes a custom style through alongside the font fix', () => {
    const custom = { opacity: 0.5 };
    const { root } = renderTree(<IconSymbol name="star.fill" color="#f00" style={custom} />);
    const style = glyph(root).props.style as Array<Record<string, unknown> | undefined>;
    expect(style[1]).toBe(custom);
  });

  it('matches the default snapshot', () => {
    const { toJSON } = renderTree(<IconSymbol name="house.fill" color="#111" />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the community-variant snapshot', () => {
    const { toJSON } = renderTree(<IconSymbol name="trophy" color="#111" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
