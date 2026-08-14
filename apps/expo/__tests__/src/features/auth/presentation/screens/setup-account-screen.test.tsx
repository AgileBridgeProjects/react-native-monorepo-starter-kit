import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { SetupAccountScreen } from '@features/auth/presentation/screens/setup-account-screen';
import { ApiError } from '@lib/http/api-error';
import React from 'react';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  byTestId,
  flushInteractions,
  hostByTestId,
  renderTree,
  type TestNode,
  textChildren,
} from '@/test/utils/rtr';

// Password inputs go through the mocked PasswordField (which the real source does not
// give a testID), so these selectors are test-local.
const PW_INPUT = 'setup-password-input';
const CONFIRM_INPUT = 'setup-confirmPassword-input';

const replaceMock = vi.fn();
const completeSetupMock = vi.fn();
let searchParams: { token?: string; purpose?: string } = { token: 'tok-123' };
const completeState: {
  mutate: typeof completeSetupMock;
  isPending: boolean;
  error: Error | null;
  isSuccess: boolean;
} = { mutate: completeSetupMock, isPending: false, error: null, isSuccess: false };
const tokenState: {
  data: { purpose?: string; email?: string } | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} = {
  data: { purpose: 'AccountSetup', email: 'new@user.com' },
  isLoading: false,
  isError: false,
  error: null,
};

vi.mock('expo-router', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useLocalSearchParams: () => searchParams,
}));
vi.mock('@features/auth/presentation/hooks/use-complete-setup', () => ({
  useCompleteSetup: () => completeState,
}));
vi.mock('@features/auth/presentation/hooks/use-validate-setup-token', () => ({
  useValidateSetupToken: () => tokenState,
}));
const loginMutate = vi.fn();
const loginState: { mutate: typeof loginMutate } = { mutate: loginMutate };
vi.mock('@features/auth/presentation/hooks/use-auth', () => ({
  useLogin: () => loginState,
}));
vi.mock('@/src/lib/i18n', async () => (await import('@/test/mocks/shared')).i18nPassthrough());
vi.mock('@/constants/tokens', async () => (await import('@/test/mocks/shared')).tokensMock());
vi.mock('@/components/ui/icon', async () => (await import('@/test/mocks/shared')).iconMock());
vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
vi.mock('@/src/lib/cn', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }));
vi.mock('@features/auth/presentation/components/auth-screen-layout', () => ({
  AuthScreenLayout: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('@features/auth/presentation/components/gradient-cta-button', () => ({
  GradientCtaButton: ({
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
    React.createElement(
      'Pressable',
      { testID, onPress, accessibilityState: { busy: !!loading } },
      React.createElement('Text', null, children),
    ),
}));
vi.mock('@features/auth/presentation/components/password-rules-checklist', () => ({
  PasswordRulesChecklist: () => React.createElement('View', { testID: 'password-rules' }),
}));
vi.mock('@features/auth/presentation/components/password-field', async () => {
  const { controllerField } = await import('@/test/mocks/ui');
  return {
    PasswordField: ({ control, name }: { control: unknown; name: string }) =>
      controllerField(control, name, { testID: `setup-${name}-input` }),
  };
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
const render = () => renderTree(React.createElement(SetupAccountScreen));
const renderRoot = (): TestNode => render().root;

async function setText(root: TestNode, testID: string, value: string) {
  await act(async () => {
    root.find((n) => n.type === 'TextInput' && n.props.testID === testID).props.onChangeText(value);
  });
}
async function submit(root: TestNode) {
  await act(async () => {
    await byTestId(root, AUTH_TEST_IDS.setup.submitButton).props.onPress?.();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = { token: 'tok-123' };
  completeState.isPending = false;
  completeState.error = null;
  completeState.isSuccess = false;
  completeState.mutate = completeSetupMock;
  tokenState.data = { purpose: 'AccountSetup', email: 'new@user.com' };
  tokenState.isLoading = false;
  tokenState.isError = false;
  tokenState.error = null;
  loginMutate.mockReset();
});

// ════════════════════════════════════════════════════════════════════════════════
describe('SetupAccountScreen — snapshots', () => {
  it('matches the form tree', () => {
    expect(render().toJSON()).toMatchSnapshot();
  });
});

describe('SetupAccountScreen — guard states', () => {
  it('shows the invalid-link state when no token is present', () => {
    searchParams = {};
    const root = renderRoot();
    expect(byTestId(root, AUTH_TEST_IDS.setup.invalidLink)).toBeTruthy();
    expect(textChildren(root)).toContain('setup.invalidLink');
  });

  it('shows the validating state while the token is being checked', () => {
    tokenState.isLoading = true;
    tokenState.data = undefined;
    const root = renderRoot();
    expect(byTestId(root, AUTH_TEST_IDS.setup.validating)).toBeTruthy();
  });

  it('shows the token-invalid state when validation fails', () => {
    tokenState.isError = true;
    tokenState.data = undefined;
    const root = renderRoot();
    expect(byTestId(root, AUTH_TEST_IDS.setup.tokenInvalid)).toBeTruthy();
    expect(textChildren(root)).toContain('setup.tokenExpired');
  });

  it('shows the password-reset-specific expired message when purpose is reset', () => {
    tokenState.isError = true;
    tokenState.data = undefined;
    searchParams = { token: 'tok-123', purpose: 'reset' };
    expect(textChildren(renderRoot())).toContain('setup.tokenExpiredPasswordReset');
  });

  it('surfaces the backend reason (ProblemDetails.detail) for a 4xx validation error', () => {
    tokenState.isError = true;
    tokenState.data = undefined;
    tokenState.error = new ApiError(400, 'This setup link has been superseded by a newer one.');
    expect(textChildren(renderRoot())).toContain(
      'This setup link has been superseded by a newer one.',
    );
  });

  it('falls back to generic copy for a server/network error (no specific reason)', () => {
    tokenState.isError = true;
    tokenState.data = undefined;
    tokenState.error = new ApiError(500, 'Internal Server Error');
    const text = textChildren(renderRoot());
    expect(text).toContain('setup.tokenExpired');
    expect(text).not.toContain('Internal Server Error');
  });

  it('renders nothing once setup succeeds (token consumed)', () => {
    completeState.isSuccess = true;
    expect(render().toJSON()).toBeNull();
  });
});

describe('SetupAccountScreen — form', () => {
  it('renders the back link, title, both password fields and submit', () => {
    const root = renderRoot();
    expect(byTestId(root, AUTH_TEST_IDS.setup.backButton)).toBeTruthy();
    expect(byTestId(root, PW_INPUT)).toBeTruthy();
    expect(byTestId(root, CONFIRM_INPUT)).toBeTruthy();
    expect(byTestId(root, AUTH_TEST_IDS.setup.submitButton)).toBeTruthy();
    expect(textChildren(root)).toContain('setup.title');
  });

  it('uses the password-reset title when the token purpose is PasswordReset', () => {
    tokenState.data = { purpose: 'PasswordReset', email: 'x@y.z' };
    expect(textChildren(renderRoot())).toContain('setup.titlePasswordReset');
  });

  it('shows the error alert when the mutation errors', () => {
    completeState.error = new Error('boom');
    expect(textChildren(byTestId(renderRoot(), 'alert-error'))).toContain('setup.errorGeneric');
  });

  it('reflects the pending state on the submit CTA', () => {
    completeState.isPending = true;
    expect(
      hostByTestId(renderRoot(), AUTH_TEST_IDS.setup.submitButton).props.accessibilityState.busy,
    ).toBeTruthy();
  });

  it('navigates back to login via the back link', async () => {
    const root = renderRoot();
    await act(async () => {
      await byTestId(root, AUTH_TEST_IDS.setup.backButton).props.onPress?.();
    });
    expect(replaceMock).toHaveBeenCalledWith('/(auth)/login');
  });
});

describe('SetupAccountScreen — submit + validation', () => {
  it('completes setup with the token and new password when valid', async () => {
    const root = renderRoot();
    await setText(root, PW_INPUT, 'Passw0rd!');
    await setText(root, CONFIRM_INPUT, 'Passw0rd!');
    await submit(root);
    expect(completeSetupMock).toHaveBeenCalledWith({ token: 'tok-123', newPassword: 'Passw0rd!' });
  });

  it('blocks submit when the password fails complexity', async () => {
    const root = renderRoot();
    await setText(root, PW_INPUT, 'password');
    await setText(root, CONFIRM_INPUT, 'password');
    await submit(root);
    expect(completeSetupMock).not.toHaveBeenCalled();
  });

  it('blocks submit when the passwords do not match', async () => {
    const root = renderRoot();
    await setText(root, PW_INPUT, 'Passw0rd!');
    await setText(root, CONFIRM_INPUT, 'Different1!');
    await submit(root);
    expect(completeSetupMock).not.toHaveBeenCalled();
  });
});

describe('SetupAccountScreen — success navigation', () => {
  it('redirects to login with resetSuccess flag on success for password reset', () => {
    searchParams = { token: 'tok-123', purpose: 'reset' };
    completeState.isSuccess = true;
    render();
    expect(replaceMock).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { resetSuccess: '1' },
    });
  });

  it('auto signs in with the token email and chosen password on account-setup success', () => {
    completeState.isSuccess = true;
    render();

    expect(loginMutate).toHaveBeenCalledWith(
      { email: 'new@user.com', password: '' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('redirects home once auto sign-in succeeds', async () => {
    completeState.isSuccess = true;
    render();

    const { onSuccess } = loginMutate.mock.calls[0][1];
    await act(async () => {
      await onSuccess();
    });
    await flushInteractions();

    expect(replaceMock).toHaveBeenCalledWith('/');
  });

  it('redirects to login when auto sign-in fails', () => {
    completeState.isSuccess = true;
    render();

    const { onError } = loginMutate.mock.calls[0][1];
    act(() => {
      onError();
    });

    expect(replaceMock).toHaveBeenCalledWith('/(auth)/login');
  });
});
