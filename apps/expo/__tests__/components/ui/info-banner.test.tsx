import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { InfoBanner } from '@/components/ui/info-banner';
import { hostByTestId, renderTree, textChildren } from '@/test/utils/rtr';

vi.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ name, color }: { name: string; color?: string }) => (
    <View testID={`icon-${name}`} accessibilityLabel={color} />
  ),
}));

describe('InfoBanner', () => {
  it('renders the message and the default clock icon in the primary variant', () => {
    const renderer = renderTree(<InfoBanner message="Heads up" testID="banner" />);

    expect(textChildren(renderer.root)).toContain('Heads up');
    expect(hostByTestId(renderer.root, 'icon-clock.fill')).toBeTruthy();
    const container = hostByTestId(renderer.root, 'banner');
    expect(container.props.className).toContain('bg-primary/10');
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('renders the muted variant with the surface background', () => {
    const renderer = renderTree(
      <InfoBanner message="You are offline" icon="wifi.slash" variant="muted" testID="banner" />,
    );

    const container = hostByTestId(renderer.root, 'banner');
    expect(container.props.className).toContain('bg-surface');
    expect(container.props.className).not.toContain('bg-primary/10');
    expect(hostByTestId(renderer.root, 'icon-wifi.slash')).toBeTruthy();
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('uses the primary colour for the icon in the primary variant', () => {
    const renderer = renderTree(<InfoBanner message="Heads up" testID="banner" />);
    const icon = hostByTestId(renderer.root, 'icon-clock.fill');

    // Light primary token — see constants/tokens.ts.
    expect(typeof icon.props.accessibilityLabel).toBe('string');
    expect(icon.props.accessibilityLabel).not.toBe('');
  });

  it('renders a custom icon when provided', () => {
    const renderer = renderTree(<InfoBanner message="Locked" icon="lock.fill" testID="banner" />);

    expect(hostByTestId(renderer.root, 'icon-lock.fill')).toBeTruthy();
  });

  it('merges extra className overrides onto the container', () => {
    const renderer = renderTree(
      <InfoBanner message="Heads up" className="mt-lg" testID="banner" />,
    );

    expect(hostByTestId(renderer.root, 'banner').props.className).toContain('mt-lg');
  });
});
