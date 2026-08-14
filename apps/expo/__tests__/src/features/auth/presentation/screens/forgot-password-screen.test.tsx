import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { ForgotPasswordScreen } from '@features/auth/presentation/screens/forgot-password-screen';
import { CUSTOM_AUTH_EMAIL_DOMAIN } from '@starterkit/shared';
import React from 'react';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  byTestId,
  hostByTestId,
  inputByTestId,
  queryAllByTestId as queryAll,
  renderTree,
  type TestNode,
  textChildren,
} from '@/test/utils/rtr';

const replaceMock = vi.fn();
const sendResetMock = vi.fn();
const mutationState = { mutate: sendResetMock, isPending: false };

vi.mock('expo-router', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));
vi.mock('@features/auth/presentation/hooks/use-request-password-reset', () => ({
  useRequestPasswordReset: () => mutationState,
}));
vi.mock('@/src/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/constants/tokens', () => ({
  iconSize: { xs: 12, sm: 16, md: 20, lg: 24 },
  palette: {
    neutral: { 400: '#9ca3af' },
    status: { success: '#22c55e' },
    white: { DEFAULT: '#ffffff' },
    blue: { DEFAULT: '#0a3d91' },
    // Read by the shared SCREEN_GRADIENT (gradient-background.tsx), which
    // auth-gradient-hero.tsx now sources — loaded via the direct
    // AUTH_MESH_A11Y_LABEL import below, even though AuthScreenLayout itself is mocked.
    gradient: { start: '#031e58', mid: '#0d90b1', end: '#021546' },
  },
}));
vi.mock('@/components/ui/icon', () => ({ Icon: () => null }));
vi.mock('@features/auth/presentation/components/auth-screen-layout', () => ({
  AuthScreenLayout: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('@/components/ui', async () => {
  const ReactModule = await import('react');
  const ReactLib = (ReactModule as { default?: typeof React }).default ?? ReactModule;
  const { Controller } = await import('react-hook-form');
  // biome-ignore lint/suspicious/noExplicitAny: RN string element types
  const h = ReactLib.createElement as (...args: any[]) => React.ReactElement;
  return {
    Typography: ({ children, ...rest }: { children?: React.ReactNode }) =>
      h('Text', rest, children),
    Button: ({
      children,
      onPress,
      testID,
      loading,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      loading?: boolean;
    }) =>
      h(
        'Pressable',
        { testID, onPress, accessibilityState: { busy: !!loading } },
        h('Text', null, children),
      ),
    FormField: ({
      control,
      name,
      testID,
      placeholder,
    }: {
      control: unknown;
      name: string;
      testID?: string;
      placeholder?: string;
    }) =>
      h(Controller, {
        control,
        name,
        render: ({ field }: { field: { value: string; onChange: (v: string) => void } }) =>
          h('TextInput', { testID, placeholder, value: field.value, onChangeText: field.onChange }),
      }),
  };
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
const render = () => renderTree(React.createElement(ForgotPasswordScreen));

async function setEmail(root: TestNode, value: string) {
  await act(async () => {
    inputByTestId(root, AUTH_TEST_IDS.forgotPassword.emailInput).props.onChangeText(value);
  });
}
async function submit(root: TestNode) {
  await act(async () => {
    await byTestId(root, AUTH_TEST_IDS.forgotPassword.submitButton).props.onPress?.();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mutationState.isPending = false;
  mutationState.mutate = sendResetMock;
});

// ════════════════════════════════════════════════════════════════════════════════
describe('ForgotPasswordScreen — snapshots', () => {
  it('matches the initial tree', () => {
    expect(render().toJSON()).toMatchSnapshot();
  });

  it('matches the success tree', async () => {
    sendResetMock.mockImplementation((_email, opts) => opts?.onSettled?.());
    const renderer = render();
    await setEmail(renderer.root, 'user@example.com');
    await submit(renderer.root);
    expect(renderer.toJSON()).toMatchSnapshot();
  });
});

describe('ForgotPasswordScreen — initial render', () => {
  it('renders the back link, title and subtitle', () => {
    const root = render().root;
    expect(byTestId(root, AUTH_TEST_IDS.forgotPassword.backButton)).toBeTruthy();
    const text = textChildren(root);
    expect(text).toContain('forgotPassword.title');
    expect(text).toContain('forgotPassword.subtitle');
    expect(text).toContain('forgotPassword.backToLogin');
  });

  it('renders the email field and submit button', () => {
    const root = render().root;
    expect(byTestId(root, AUTH_TEST_IDS.forgotPassword.emailInput)).toBeTruthy();
    expect(byTestId(root, AUTH_TEST_IDS.forgotPassword.submitButton)).toBeTruthy();
    expect(textChildren(root)).toContain('forgotPassword.submitButton');
  });

  it('does not render the success card initially', () => {
    expect(queryAll(render().root, AUTH_TEST_IDS.forgotPassword.successCard)).toHaveLength(0);
  });

  it('reflects the pending state on the submit CTA', () => {
    mutationState.isPending = true;
    expect(
      hostByTestId(render().root, AUTH_TEST_IDS.forgotPassword.submitButton).props
        .accessibilityState.busy,
    ).toBeTruthy();
  });
});

describe('ForgotPasswordScreen — navigation', () => {
  it('returns to login when the back link is pressed', async () => {
    const root = render().root;
    await act(async () => {
      await byTestId(root, AUTH_TEST_IDS.forgotPassword.backButton).props.onPress?.();
    });
    expect(replaceMock).toHaveBeenCalledWith('/(auth)/login');
  });
});

describe('ForgotPasswordScreen — submit + validation', () => {
  it('requests a reset for a valid email', async () => {
    const root = render().root;
    await setEmail(root, 'user@example.com');
    await submit(root);
    expect(sendResetMock).toHaveBeenCalledWith('user@example.com', expect.anything());
  });

  it('blocks submit for an empty email', async () => {
    const root = render().root;
    await submit(root);
    expect(sendResetMock).not.toHaveBeenCalled();
  });

  it('blocks submit for an invalid email', async () => {
    const root = render().root;
    await setEmail(root, 'not-an-email');
    await submit(root);
    expect(sendResetMock).not.toHaveBeenCalled();
  });

  it('blocks submit for a custom-auth (username) address — reset not eligible', async () => {
    const root = render().root;
    await setEmail(root, `someone${CUSTOM_AUTH_EMAIL_DOMAIN}`);
    await submit(root);
    expect(sendResetMock).not.toHaveBeenCalled();
  });
});

describe('ForgotPasswordScreen — success state', () => {
  it('shows the success card and hides the form once the request settles', async () => {
    sendResetMock.mockImplementation((_email, opts) => opts?.onSettled?.());
    const root = render().root;
    await setEmail(root, 'user@example.com');
    await submit(root);

    expect(byTestId(root, AUTH_TEST_IDS.forgotPassword.successCard)).toBeTruthy();
    const text = textChildren(root);
    expect(text).toContain('forgotPassword.successTitle');
    expect(text).toContain('forgotPassword.successMessage');
    // form + subtitle gone
    expect(queryAll(root, AUTH_TEST_IDS.forgotPassword.emailInput)).toHaveLength(0);
    expect(text).not.toContain('forgotPassword.subtitle');
  });

  it('shows success even when the request errors (no account enumeration)', async () => {
    sendResetMock.mockImplementation((_email, opts) => opts?.onSettled?.());
    const root = render().root;
    await setEmail(root, 'ghost@example.com');
    await submit(root);
    expect(byTestId(root, AUTH_TEST_IDS.forgotPassword.successCard)).toBeTruthy();
  });
});
