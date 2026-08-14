import { MicrosoftSignInButton } from '@features/auth/presentation/components/microsoft-sign-in-button';
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
        'data-icon': icon,
        'data-fullwidth': fullWidth,
      },
      brandIcon as React.ReactNode,
      React.createElement('Text', null, label as string),
    ),
}));

const onPress = vi.fn();
type Props = Partial<Parameters<typeof MicrosoftSignInButton>[0]>;
const render = (props: Props = {}): TestNode =>
  renderTree(React.createElement(MicrosoftSignInButton, { onPress, testID: 'ms', ...props })).root;

beforeEach(() => vi.clearAllMocks());

describe('MicrosoftSignInButton — snapshots', () => {
  it('matches the default tree', () => {
    expect(
      renderTree(React.createElement(MicrosoftSignInButton, { onPress, testID: 'ms' })).toJSON(),
    ).toMatchSnapshot();
  });
});

describe('MicrosoftSignInButton', () => {
  it('renders with the windows icon, label and brand SVG (four squares)', () => {
    const root = render();
    const host = hostByTestId(root, 'ms');
    expect(host.props['data-icon']).toBe('windows');
    expect(host.props.accessibilityLabel).toBe('microsoft.signInWithMicrosoftA11y');
    // The Microsoft logo is four coloured rects.
    expect(root.findAllByType('Rect')).toHaveLength(4);
  });

  it('forwards onPress', async () => {
    await firePress(byTestId(render(), 'ms'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reflects the loading state and suppresses press', async () => {
    const host = hostByTestId(render({ loading: true }), 'ms');
    expect(host.props.accessibilityState.busy).toBeTruthy();
    await firePress(host);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('reflects the disabled state and suppresses press', async () => {
    const host = hostByTestId(render({ disabled: true }), 'ms');
    expect(host.props.accessibilityState.disabled).toBeTruthy();
    await firePress(host);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('forwards the fullWidth flag', () => {
    expect(hostByTestId(render({ fullWidth: true }), 'ms').props['data-fullwidth']).toBe(true);
  });
});
