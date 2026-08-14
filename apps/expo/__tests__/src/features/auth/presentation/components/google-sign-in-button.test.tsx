import { GoogleSignInButton } from '@features/auth/presentation/components/google-sign-in-button';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { byTestId, firePress, hostByTestId, renderTree, type TestNode } from '@/test/utils/rtr';

vi.mock('@lib/i18n', async () => (await import('@/test/mocks/shared')).i18nPassthrough());

// Capture the props the wrapper forwards to the shared SocialSignInButton.
vi.mock('@features/auth/presentation/components/social-sign-in-button', () => ({
  SocialSignInButton: ({
    icon,
    brandIcon,
    label,
    accessibilityLabel,
    onPress,
    loading,
    disabled,
    fullWidth,
    testID,
  }: Record<string, unknown>) =>
    React.createElement(
      'Pressable',
      {
        testID,
        accessibilityLabel,
        accessibilityState: { disabled: !!disabled, busy: !!loading },
        onPress: disabled || loading ? undefined : (onPress as () => void),
        // surface forwarded config for assertions
        'data-icon': icon,
        'data-fullwidth': fullWidth,
      },
      brandIcon as React.ReactNode,
      React.createElement('Text', null, label as string),
    ),
}));

const onPress = vi.fn();
type Props = Partial<Parameters<typeof GoogleSignInButton>[0]>;
const render = (props: Props = {}): TestNode =>
  renderTree(React.createElement(GoogleSignInButton, { onPress, testID: 'google', ...props })).root;

beforeEach(() => vi.clearAllMocks());

describe('GoogleSignInButton — snapshots', () => {
  it('matches the default tree', () => {
    expect(
      renderTree(React.createElement(GoogleSignInButton, { onPress, testID: 'google' })).toJSON(),
    ).toMatchSnapshot();
  });
});

describe('GoogleSignInButton', () => {
  it('renders with the Google icon, label and brand SVG', () => {
    const host = hostByTestId(render(), 'google');
    expect(host.props['data-icon']).toBe('google');
    expect(host.props.accessibilityLabel).toBe('google.signInWithGoogleA11y');
    expect(render().findAllByType('Svg').length).toBeGreaterThan(0);
  });

  it('forwards onPress', async () => {
    await firePress(byTestId(render(), 'google'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reflects the loading state and suppresses press', async () => {
    const host = hostByTestId(render({ loading: true }), 'google');
    expect(host.props.accessibilityState.busy).toBeTruthy();
    await firePress(host);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('reflects the disabled state and suppresses press', async () => {
    const host = hostByTestId(render({ disabled: true }), 'google');
    expect(host.props.accessibilityState.disabled).toBeTruthy();
    await firePress(host);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('forwards the fullWidth flag', () => {
    expect(hostByTestId(render({ fullWidth: true }), 'google').props['data-fullwidth']).toBe(true);
  });
});
