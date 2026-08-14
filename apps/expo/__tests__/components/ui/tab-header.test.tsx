import { Platform } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TabHeader } from '@/components/ui/tab-header';
import { firePress, renderTree, textChildren } from '@/test/utils/rtr';

const routerPush = vi.hoisted(() => vi.fn());

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('expo-image', () => ({ Image: 'Image' }));

vi.mock('@/components/ui/icon', async () => {
  const React = await import('react');
  return {
    Icon: ({ name }: { name: string }) => React.createElement('View', { testID: `icon-${name}` }),
  };
});

function setOS(os: 'ios' | 'android' | 'web') {
  (Platform as { OS: string }).OS = os;
}

beforeEach(() => {
  routerPush.mockClear();
});

afterEach(() => {
  setOS('ios');
});

describe('TabHeader', () => {
  it('does not render the page title — the heading lives in the screen body', () => {
    const { root } = renderTree(<TabHeader title="Home" colorScheme="light" />);

    expect(textChildren(root)).not.toContain('Home');
  });

  it('exposes the page name as the header accessibility label', () => {
    const { root } = renderTree(<TabHeader title="Profile" colorScheme="light" />);

    expect(root.find((n) => n.props.accessibilityLabel === 'Profile')).toBeTruthy();
  });

  it('renders the menu hamburger', () => {
    const { root } = renderTree(<TabHeader title="Home" colorScheme="light" />);

    expect(root.findAll((n) => n.props.testID === 'icon-line.3.horizontal')).toHaveLength(1);
  });

  it('navigates to /profile when the hamburger is pressed', async () => {
    const { root } = renderTree(<TabHeader title="Home" colorScheme="light" />);

    const hamburger = root
      .findAll((n) => n.type === 'Pressable')
      .find((p) => p.props.accessibilityLabel === 'Open menu');
    await firePress(hamburger);

    expect(routerPush).toHaveBeenCalledWith('/profile');
  });

  it('renders the club logo when logoUrl is set', () => {
    const { root } = renderTree(
      <TabHeader title="Home" colorScheme="light" logoUrl="https://cdn/logo.png" />,
    );

    expect(root.findAll((n) => n.type === 'Image')).toHaveLength(1);
  });

  it('renders no logo when logoUrl is absent', () => {
    const { root } = renderTree(<TabHeader title="Home" colorScheme="light" />);

    expect(root.findAll((n) => n.type === 'Image')).toHaveLength(0);
  });

  it('matches the default snapshot', () => {
    const { toJSON } = renderTree(<TabHeader title="Home" colorScheme="light" />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the logo snapshot', () => {
    const { toJSON } = renderTree(
      <TabHeader title="Home" colorScheme="light" logoUrl="https://cdn/logo.png" />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
