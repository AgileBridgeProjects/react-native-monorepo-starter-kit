import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { LoginScreen } from '@features/auth/presentation/screens/login-screen';
import { CUSTOM_AUTH_EMAIL_DOMAIN } from '@starterkit/shared';
import React from 'react';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  byTestId,
  flushInteractions,
  hostByTestId,
  inputByTestId,
  queryAllByTestId,
  renderTree,
  type TestNode,
  textChildren,
} from '@/test/utils/rtr';

// ─── Controllable router + param state ─────────────────────────────────────────
const replaceMock = vi.fn();
const pushMock = vi.fn();
let searchParams: Record<string, string> = {};

vi.mock('expo-router', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  useLocalSearchParams: () => searchParams,
}));

// ─── Controllable hook state ───────────────────────────────────────────────────
const loginMock = vi.fn();
const resetLoginMock = vi.fn();

type MutationState = {
  mutate: ReturnType<typeof vi.fn>;
  isPending: boolean;
  error: Error | null;
  reset: ReturnType<typeof vi.fn>;
};

const loginState: MutationState = {
  mutate: loginMock,
  isPending: false,
  error: null,
  reset: resetLoginMock,
};

vi.mock('@features/auth/presentation/hooks/use-auth', () => ({
  useLogin: () => loginState,
}));

// ─── Sign in with Apple (native) ────────────────────────────────────────────────
const appleSignInMock = vi.fn();
const appleState = { signIn: appleSignInMock, isLoading: false, error: null as Error | null };
vi.mock('@features/auth/presentation/hooks/use-apple-sign-in', () => ({
  useAppleSignIn: (onSuccess?: () => void) => {
    // Mirror the real hook: onSuccess navigates home. Expose it via the mock so
    // the "navigates home" behaviour stays wired for the button press test.
    appleSignInMock.mockImplementation(() => onSuccess?.());
    return appleState;
  },
}));

// expo-apple-authentication is a native module; stub the availability probe and
// scope enums the screen imports. isAvailableAsync resolves true so the iOS-only
// Apple button renders after the availability effect flushes.
vi.mock('expo-apple-authentication', () => ({
  isAvailableAsync: vi.fn(() => Promise.resolve(true)),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

// ─── Lib / token mocks ─────────────────────────────────────────────────────────
vi.mock('@/src/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
// Echo the error's message so alert assertions are deterministic (mapping is covered by
// error-message.test.ts — here we only assert the screen surfaces the resolved message).
vi.mock('@/src/lib/error-message', () => ({
  getErrorMessage: (error: { message?: string } | null) => (error ? (error.message ?? null) : null),
}));
vi.mock('@/constants/tokens', () => ({
  iconSize: { xs: 12, sm: 16, md: 20, lg: 24 },
  palette: {
    blue: { DEFAULT: '#0a3d91' },
    neutral: { 400: '#9ca3af' },
    white: { DEFAULT: '#ffffff' },
    // Read by the shared SCREEN_GRADIENT (gradient-background.tsx), which
    // auth-gradient-hero.tsx now sources — loaded via the direct
    // AUTH_MESH_A11Y_LABEL import below, even though AuthScreenLayout itself is mocked.
    gradient: { start: '#031e58', mid: '#0d90b1', end: '#021546' },
  },
}));
vi.mock('@/components/ui/icon', () => ({ Icon: () => null }));

// ─── Feature component mocks (wired for interaction) ───────────────────────────
vi.mock('@features/auth/presentation/components/auth-screen-layout', () => ({
  AuthScreenLayout: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
type SocialButtonProps = { onPress?: () => void; testID?: string; disabled?: boolean };
const renderSocialButton = ({ onPress, testID, disabled }: SocialButtonProps) =>
  React.createElement('Pressable', {
    testID,
    onPress: disabled ? undefined : onPress,
    accessibilityState: { disabled: !!disabled },
  });
vi.mock('@features/auth/presentation/components/google-sign-in-button', () => ({
  GoogleSignInButton: (props: SocialButtonProps) => renderSocialButton(props),
}));
vi.mock('@features/auth/presentation/components/apple-sign-in-button', () => ({
  AppleSignInButton: (props: SocialButtonProps) => renderSocialButton(props),
}));

// ─── @/components/ui — wired to real react-hook-form Controller ────────────────
vi.mock('@/components/ui', async () => {
  const ReactModule = await import('react');
  const ReactLib = (ReactModule as { default?: typeof React }).default ?? ReactModule;
  const { Controller } = await import('react-hook-form');
  // biome-ignore lint/suspicious/noExplicitAny: RN string element types
  const h = ReactLib.createElement as (...args: any[]) => React.ReactElement;
  return {
    Alert: ({
      message,
      variant,
      onDismiss,
    }: {
      message?: string | null;
      variant?: string;
      onDismiss?: () => void;
    }) =>
      message
        ? h(
            'Pressable',
            { testID: `alert-${variant}`, onPress: onDismiss },
            h('Text', null, message),
          )
        : null,
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
        render: ({
          field,
        }: {
          field: { value: string; onChange: (v: string) => void; onBlur: () => void };
        }) =>
          h('TextInput', {
            testID,
            placeholder,
            value: field.value,
            onChangeText: field.onChange,
            onBlur: field.onBlur,
          }),
      }),
    Typography: ({ children, ...rest }: { children?: React.ReactNode }) =>
      h('Text', rest, children),
  };
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
const renderScreen = (): TestNode => renderTree(React.createElement(LoginScreen)).root;
const renderRenderer = () => renderTree(React.createElement(LoginScreen));

async function setInput(root: TestNode, testID: string, value: string) {
  const input = inputByTestId(root, testID);
  await act(async () => {
    input.props.onChangeText(value);
  });
}

async function press(node: TestNode) {
  await act(async () => {
    await node.props.onPress?.();
  });
}

// ─── Reset state between tests ─────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  searchParams = {};
  Object.assign(loginState, {
    isPending: false,
    error: null,
    mutate: loginMock,
    reset: resetLoginMock,
  });
});

// Social sign-in is gated behind EXPO_PUBLIC_SOCIAL_AUTH_ENABLED (default OFF).
const enableSocialAuth = () => vi.stubEnv('EXPO_PUBLIC_SOCIAL_AUTH_ENABLED', 'true');

// ════════════════════════════════════════════════════════════════════════════════
// Structural snapshot — any change to the rendered tree (elements, order, props,
// className passed to children) trips this until intentionally updated with -u.
describe('LoginScreen — structural snapshot', () => {
  it('matches the rendered tree', () => {
    expect(renderRenderer().toJSON()).toMatchSnapshot();
  });

  it('matches the tree with a login error', () => {
    loginState.error = new Error('Invalid credentials');
    expect(renderRenderer().toJSON()).toMatchSnapshot();
  });

  it('matches the tree with the reset-success banner', () => {
    searchParams = { resetSuccess: 'true' };
    expect(renderRenderer().toJSON()).toMatchSnapshot();
  });

  it('matches the tree with social sign-in enabled', () => {
    enableSocialAuth();
    expect(renderRenderer().toJSON()).toMatchSnapshot();
  });
});

describe('LoginScreen — layout', () => {
  it('renders the "Sign in" heading', () => {
    expect(textChildren(renderScreen())).toContain('login.title');
  });

  it('renders the email, password and submit controls', () => {
    const root = renderScreen();
    expect(byTestId(root, AUTH_TEST_IDS.login.emailInput)).toBeTruthy();
    expect(byTestId(root, AUTH_TEST_IDS.login.passwordInput)).toBeTruthy();
    expect(byTestId(root, AUTH_TEST_IDS.login.submitButton)).toBeTruthy();
    expect(textChildren(root)).toContain('login.submitButton');
  });

  it('renders forgot-password and terms, but not the removed remember-me control', () => {
    const root = renderScreen();
    const text = textChildren(root);
    expect(text).toContain('login.forgotPassword');
    expect(text).toContain('login.terms');
    expect(text).not.toContain('login.rememberMe');
    expect(queryAllByTestId(root, 'login-remember-me')).toHaveLength(0);
  });

  it('does not render the removed phone / Microsoft controls', () => {
    const root = renderScreen();
    expect(queryAllByTestId(root, AUTH_TEST_IDS.login.microsoftButton)).toHaveLength(0);
    expect(queryAllByTestId(root, AUTH_TEST_IDS.login.phoneButton)).toHaveLength(0);
  });

  it('reflects the pending state on the submit CTA', () => {
    loginState.isPending = true;
    const root = renderScreen();
    expect(
      hostByTestId(root, AUTH_TEST_IDS.login.submitButton).props.accessibilityState.busy,
    ).toBeTruthy();
  });
});

describe('LoginScreen — social sign-in gating', () => {
  it('hides the social buttons and the "or login with" divider by default (flag off)', () => {
    const root = renderScreen();
    expect(queryAllByTestId(root, AUTH_TEST_IDS.login.googleButton)).toHaveLength(0);
    expect(queryAllByTestId(root, AUTH_TEST_IDS.login.appleButton)).toHaveLength(0);
    expect(textChildren(root)).not.toContain('social.orLoginWith');
    // Email/password form still renders.
    expect(byTestId(root, AUTH_TEST_IDS.login.emailInput)).toBeTruthy();
    expect(byTestId(root, AUTH_TEST_IDS.login.passwordInput)).toBeTruthy();
  });

  it('renders the Google and Apple social buttons and divider when the flag is on', () => {
    enableSocialAuth();
    const root = renderScreen();
    expect(byTestId(root, AUTH_TEST_IDS.login.googleButton)).toBeTruthy();
    expect(byTestId(root, AUTH_TEST_IDS.login.appleButton)).toBeTruthy();
    expect(textChildren(root)).toContain('social.orLoginWith');
  });
});

describe('LoginScreen — forgot password', () => {
  it('navigates to forgot-password when the link is pressed', async () => {
    const root = renderScreen();
    await press(byTestId(root, AUTH_TEST_IDS.login.forgotPassword));
    expect(pushMock).toHaveBeenCalledWith('/(auth)/forgot-password');
  });
});

describe('LoginScreen — reset-success + error alerts', () => {
  it('shows the reset-success alert only when the resetSuccess param is present', () => {
    expect(queryAllByTestId(renderScreen(), 'alert-success')).toHaveLength(0);
    searchParams = { resetSuccess: 'true' };
    const root = renderScreen();
    expect(byTestId(root, 'alert-success')).toBeTruthy();
    expect(textChildren(root)).toContain('login.resetSuccess');
  });

  it('shows the email login error and dismisses it via reset', async () => {
    loginState.error = new Error('Invalid credentials');
    const root = renderScreen();
    const alert = byTestId(root, 'alert-error');
    expect(textChildren(alert)).toContain('Invalid credentials');
    await press(alert);
    expect(resetLoginMock).toHaveBeenCalledTimes(1);
  });

  it('shows no error alert when there is no error', () => {
    expect(queryAllByTestId(renderScreen(), 'alert-error')).toHaveLength(0);
  });
});

describe('LoginScreen — email submit', () => {
  it('appends the custom-auth domain when the identifier has no "@"', async () => {
    const root = renderScreen();
    await setInput(root, AUTH_TEST_IDS.login.emailInput, 'alice');
    await setInput(root, AUTH_TEST_IDS.login.passwordInput, 'secret123');
    await press(byTestId(root, AUTH_TEST_IDS.login.submitButton));
    expect(loginMock).toHaveBeenCalledWith(
      { email: `alice${CUSTOM_AUTH_EMAIL_DOMAIN}`, password: 'secret123' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('keeps the raw address when the identifier is already an email', async () => {
    const root = renderScreen();
    await setInput(root, AUTH_TEST_IDS.login.emailInput, 'alice@example.com');
    await setInput(root, AUTH_TEST_IDS.login.passwordInput, 'secret123');
    await press(byTestId(root, AUTH_TEST_IDS.login.submitButton));
    expect(loginMock).toHaveBeenCalledWith(
      { email: 'alice@example.com', password: 'secret123' },
      expect.anything(),
    );
  });

  it('navigates home on successful login', async () => {
    loginMock.mockImplementation((_vars, opts) => opts?.onSuccess?.());
    const root = renderScreen();
    await setInput(root, AUTH_TEST_IDS.login.emailInput, 'alice');
    await setInput(root, AUTH_TEST_IDS.login.passwordInput, 'secret123');
    await press(byTestId(root, AUTH_TEST_IDS.login.submitButton));
    await flushInteractions();
    expect(replaceMock).toHaveBeenCalledWith('/');
  });

  it('blocks submit when the form is empty (validation)', async () => {
    const root = renderScreen();
    await press(byTestId(root, AUTH_TEST_IDS.login.submitButton));
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('blocks submit when an "@" identifier is not a valid email', async () => {
    const root = renderScreen();
    await setInput(root, AUTH_TEST_IDS.login.emailInput, 'broken@');
    await setInput(root, AUTH_TEST_IDS.login.passwordInput, 'secret123');
    await press(byTestId(root, AUTH_TEST_IDS.login.submitButton));
    expect(loginMock).not.toHaveBeenCalled();
  });
});
