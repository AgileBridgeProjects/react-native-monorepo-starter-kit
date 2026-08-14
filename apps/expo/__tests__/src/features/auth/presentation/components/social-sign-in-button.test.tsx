import { SocialSignInButton } from '@features/auth/presentation/components/social-sign-in-button';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  byTestId,
  firePress,
  hostByTestId,
  queryAllByTestId,
  renderTree,
  type TestNode,
  textChildren,
} from '@/test/utils/rtr';

// The shared react-native mock omits ActivityIndicator — extend it so the loading branch renders.
vi.mock('react-native', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-native');
  return { ...actual, ActivityIndicator: 'ActivityIndicator' };
});
vi.mock('@/components/ui/icon', () => ({
  Icon: ({ name }: { name?: string }) => React.createElement('View', { testID: `icon-${name}` }),
}));
vi.mock('@/constants/tokens', () => ({
  colors: { light: { text: '#111' }, dark: { text: '#eee' } },
  iconSize: { sm: 16 },
}));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
vi.mock('@/src/lib/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

const TEST_ID = 'social-btn';
const onPress = vi.fn();

type Props = Partial<Parameters<typeof SocialSignInButton>[0]>;
const render = (props: Props = {}): TestNode =>
  renderTree(
    React.createElement(SocialSignInButton, {
      icon: 'phone.fill',
      accessibilityLabel: 'Continue',
      onPress,
      testID: TEST_ID,
      ...props,
    }),
  ).root;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SocialSignInButton — snapshots', () => {
  it('matches the default (icon + label) tree', () => {
    expect(
      renderTree(
        React.createElement(SocialSignInButton, {
          icon: 'phone.fill',
          label: 'Phone',
          accessibilityLabel: 'Phone',
          onPress,
          testID: TEST_ID,
        }),
      ).toJSON(),
    ).toMatchSnapshot();
  });

  it('matches the loading tree', () => {
    expect(
      renderTree(
        React.createElement(SocialSignInButton, {
          icon: 'phone.fill',
          accessibilityLabel: 'Phone',
          onPress,
          loading: true,
          testID: TEST_ID,
        }),
      ).toJSON(),
    ).toMatchSnapshot();
  });
});

describe('SocialSignInButton — default', () => {
  it('renders the icon and the label text', () => {
    const root = render({ label: 'Continue with Phone' });
    expect(byTestId(root, 'icon-phone.fill')).toBeTruthy();
    expect(textChildren(root)).toContain('Continue with Phone');
  });

  it('renders the brand icon instead of the FontAwesome icon when provided', () => {
    const root = render({ brandIcon: React.createElement('View', { testID: 'brand' }) });
    expect(byTestId(root, 'brand')).toBeTruthy();
    expect(queryAllByTestId(root, 'icon-phone.fill')).toHaveLength(0);
  });

  it('omits the label when none is supplied', () => {
    expect(textChildren(render())).not.toContain('Continue');
  });

  it('exposes the button role and accessibility label', () => {
    const host = hostByTestId(render(), TEST_ID);
    expect(host.props.accessibilityRole).toBe('button');
    expect(host.props.accessibilityLabel).toBe('Continue');
  });

  it('fires onPress when tapped', async () => {
    await firePress(byTestId(render(), TEST_ID));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is enabled and not busy in the default state', () => {
    const host = hostByTestId(render(), TEST_ID);
    expect(host.props.accessibilityState.disabled).toBeFalsy();
    expect(host.props.accessibilityState.busy).toBeFalsy();
  });
});

describe('SocialSignInButton — loading', () => {
  it('shows a spinner and hides icon + label', () => {
    const root = render({ label: 'Phone', loading: true });
    expect(root.findAllByType('ActivityIndicator')).toHaveLength(1);
    expect(queryAllByTestId(root, 'icon-phone.fill')).toHaveLength(0);
    expect(textChildren(root)).not.toContain('Phone');
  });

  it('marks the control busy and disabled while loading', () => {
    const host = hostByTestId(render({ loading: true }), TEST_ID);
    expect(host.props.accessibilityState.busy).toBeTruthy();
    expect(host.props.disabled).toBeTruthy();
  });
});

describe('SocialSignInButton — disabled', () => {
  it('marks the control disabled', () => {
    expect(hostByTestId(render({ disabled: true }), TEST_ID).props.disabled).toBeTruthy();
  });

  it('still reports the busy flag as false when only disabled', () => {
    expect(
      hostByTestId(render({ disabled: true }), TEST_ID).props.accessibilityState.busy,
    ).toBeFalsy();
  });
});
