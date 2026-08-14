import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { OtpVerifyScreen } from '@features/auth/presentation/screens/otp-verify-screen';
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

// ─── Controllable state ────────────────────────────────────────────────────────
const replaceMock = vi.fn();
const backMock = vi.fn();
const verifyOtpMock = vi.fn();
const finalizeMock = vi.fn().mockResolvedValue(undefined);
const clearTicketMock = vi.fn();
const devBootstrapMock = vi.fn();
const verifyState: { mutate: typeof verifyOtpMock; isPending: boolean; error: Error | null } = {
  mutate: verifyOtpMock,
  isPending: false,
  error: null,
};
// The Supabase phone flow stashes a stateless PhoneOtpTicket (just the phone number)
// between phone-login and otp-verify — the old Firebase ConfirmationResult is gone.
let phoneOtpTicket: unknown = { phoneNumber: '+27821234567' };

vi.mock('expo-router', () => ({
  useRouter: () => ({ replace: replaceMock, back: backMock }),
  useLocalSearchParams: () => ({ phone: '+27821234567' }),
}));
vi.mock('@features/auth/presentation/hooks/use-auth', () => ({
  useVerifyOtp: () => verifyState,
}));
vi.mock('@features/auth/presentation/hooks/use-finalize-auth-session', () => ({
  useFinalizeAuthSession: () => finalizeMock,
}));
vi.mock('@features/auth/presentation/hooks/use-phone-confirmation', () => ({
  getPhoneOtpTicket: () => phoneOtpTicket,
  clearPhoneOtpTicket: () => clearTicketMock(),
  setPhoneOtpTicket: vi.fn(),
}));
vi.mock('@features/auth/presentation/hooks/use-dev-bootstrap-phone', () => ({
  devBootstrapPhone: (...args: unknown[]) => devBootstrapMock(...args),
}));
vi.mock('@/src/lib/error-message', () => ({
  getErrorMessage: (error: { message?: string } | null) => (error ? (error.message ?? null) : null),
}));
vi.mock('@/src/lib/i18n', async () => (await import('@/test/mocks/shared')).i18nPassthrough());
vi.mock('@/constants/tokens', async () => (await import('@/test/mocks/shared')).tokensMock());
vi.mock('@/components/ui/icon', async () => (await import('@/test/mocks/shared')).iconMock());
vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
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

// ─── Helpers ───────────────────────────────────────────────────────────────────
const render = (): TestNode => renderTree(React.createElement(OtpVerifyScreen)).root;
const successPayload = {
  user: { ...{ id: 'u1', email: 'a@b.c', name: 'A' }, clubId: 'co-1' },
  idToken: 'tok-1',
};

async function enterOtp(root: TestNode, value: string) {
  await act(async () => {
    inputByTestId(root, AUTH_TEST_IDS.otpVerify.codeInput).props.onChangeText(value);
  });
}
async function submit(root: TestNode) {
  await act(async () => {
    await byTestId(root, AUTH_TEST_IDS.otpVerify.submitButton).props.onPress?.();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyState.isPending = false;
  verifyState.error = null;
  verifyState.mutate = verifyOtpMock;
  phoneOtpTicket = { phoneNumber: '+27821234567' };
});

// ════════════════════════════════════════════════════════════════════════════════
describe('OtpVerifyScreen — snapshots', () => {
  it('matches the default tree', () => {
    expect(renderTree(React.createElement(OtpVerifyScreen)).toJSON()).toMatchSnapshot();
  });

  it('matches the tree with a verification error', () => {
    verifyState.error = new Error('Wrong code');
    expect(renderTree(React.createElement(OtpVerifyScreen)).toJSON()).toMatchSnapshot();
  });
});

describe('OtpVerifyScreen — render', () => {
  it('renders the back button, title, subtitle, code input and submit', () => {
    const root = render();
    expect(byTestId(root, AUTH_TEST_IDS.otpVerify.backButton)).toBeTruthy();
    expect(byTestId(root, AUTH_TEST_IDS.otpVerify.codeInput)).toBeTruthy();
    expect(byTestId(root, AUTH_TEST_IDS.otpVerify.submitButton)).toBeTruthy();
    const text = textChildren(root);
    expect(text).toContain('otp.title');
    expect(text).toContain('otp.subtitle');
    expect(text).toContain('otp.submitButton');
  });

  it('shows the verification error alert when present', () => {
    verifyState.error = new Error('Wrong code');
    expect(textChildren(byTestId(render(), 'alert-error'))).toContain('Wrong code');
  });

  it('shows no error alert when there is no error', () => {
    expect(queryAllByTestId(render(), 'alert-error')).toHaveLength(0);
  });

  it('reflects the pending state on the submit CTA', () => {
    verifyState.isPending = true;
    expect(
      hostByTestId(render(), AUTH_TEST_IDS.otpVerify.submitButton).props.accessibilityState.busy,
    ).toBeTruthy();
  });
});

describe('OtpVerifyScreen — navigation', () => {
  it('goes back when the back button is pressed', async () => {
    const root = render();
    await act(async () => {
      await byTestId(root, AUTH_TEST_IDS.otpVerify.backButton).props.onPress?.();
    });
    expect(backMock).toHaveBeenCalledTimes(1);
  });
});

describe('OtpVerifyScreen — verification', () => {
  it('verifies a 6-digit code against the stored phone OTP ticket', async () => {
    const root = render();
    await enterOtp(root, '123456');
    await submit(root);
    expect(verifyOtpMock).toHaveBeenCalledWith(
      { ticket: phoneOtpTicket, otp: '123456' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('blocks verification when the code is not 6 digits', async () => {
    const root = render();
    await enterOtp(root, '123');
    await submit(root);
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it('auto-submits when the code input fires onComplete', async () => {
    const root = render();
    await enterOtp(root, '654321');
    await act(async () => {
      inputByTestId(root, AUTH_TEST_IDS.otpVerify.codeInput).props.onSubmitEditing?.();
    });
    expect(verifyOtpMock).toHaveBeenCalledTimes(1);
  });

  it('redirects to login when there is no phone OTP ticket', async () => {
    phoneOtpTicket = null;
    const root = render();
    await enterOtp(root, '123456');
    await submit(root);
    expect(verifyOtpMock).not.toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/(auth)/login');
  });

  it('finalises the session and navigates home on success (user already has a club)', async () => {
    verifyOtpMock.mockImplementation(async (_vars, opts) => {
      opts?.onSettled?.();
      await opts?.onSuccess?.(successPayload);
    });
    const root = render();
    await enterOtp(root, '123456');
    await submit(root);
    expect(finalizeMock).toHaveBeenCalledWith(successPayload.user, successPayload.idToken);
    expect(clearTicketMock).toHaveBeenCalledTimes(1);
    // Post-auth navigation goes through navigateToAppRoot, which defers the replace via
    // InteractionManager so it lands after the auth-state commit — drain that queue first.
    await flushInteractions();
    expect(replaceMock).toHaveBeenCalledWith('/');
    expect(devBootstrapMock).not.toHaveBeenCalled();
  });
});
