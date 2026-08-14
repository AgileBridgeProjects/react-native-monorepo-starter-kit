import { PhoneSignInButton } from '@features/auth/presentation/components/phone-sign-in-button';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { byTestId, firePress, hostByTestId, renderTree, type TestNode } from '@/test/utils/rtr';

vi.mock('@lib/i18n', async () => (await import('@/test/mocks/shared')).i18nPassthrough());

vi.mock('@features/auth/presentation/components/social-sign-in-button', () => ({
  SocialSignInButton: ({
    icon,
    brandIcon,
    label,
    accessibilityLabel,
    onPress,
    loading,
    fullWidth,
    testID,
  }: Record<string, unknown>) =>
    React.createElement(
      'Pressable',
      {
        testID,
        accessibilityLabel,
        accessibilityState: { busy: !!loading },
        onPress: loading ? undefined : (onPress as () => void),
        'data-icon': icon,
        'data-hasbrand': brandIcon != null,
        'data-fullwidth': fullWidth,
      },
      React.createElement('Text', null, label as string),
    ),
}));

const onPress = vi.fn();
type Props = Partial<Parameters<typeof PhoneSignInButton>[0]>;
const render = (props: Props = {}): TestNode =>
  renderTree(React.createElement(PhoneSignInButton, { onPress, testID: 'phone', ...props })).root;

beforeEach(() => vi.clearAllMocks());

describe('PhoneSignInButton — snapshots', () => {
  it('matches the default tree', () => {
    expect(
      renderTree(React.createElement(PhoneSignInButton, { onPress, testID: 'phone' })).toJSON(),
    ).toMatchSnapshot();
  });
});

describe('PhoneSignInButton', () => {
  it('renders with the phone icon, label and no brand SVG (uses the system icon)', () => {
    const host = hostByTestId(render(), 'phone');
    expect(host.props['data-icon']).toBe('phone.fill');
    expect(host.props['data-hasbrand']).toBeFalsy();
    expect(host.props.accessibilityLabel).toBe('phone.signInWithPhone');
  });

  it('forwards onPress', async () => {
    await firePress(byTestId(render(), 'phone'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reflects the loading state and suppresses press', async () => {
    const host = hostByTestId(render({ loading: true }), 'phone');
    expect(host.props.accessibilityState.busy).toBeTruthy();
    await firePress(host);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('forwards the fullWidth flag', () => {
    expect(hostByTestId(render({ fullWidth: true }), 'phone').props['data-fullwidth']).toBe(true);
  });
});
