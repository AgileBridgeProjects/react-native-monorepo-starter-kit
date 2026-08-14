import {
  useLogin,
  useLogout,
  useSendPhoneOtp,
  useVerifyOtp,
} from '@features/auth/presentation/hooks/use-auth';
import { useAuthStore } from '@store/auth-store';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook } from '@/test/utils/render-hook';

// ─── Datasource (instantiated at module load in use-auth) ──────────────────────
const login = vi.fn();
const logout = vi.fn();
const sendPhoneOtp = vi.fn();
const confirmPhoneOtp = vi.fn();
vi.mock('@features/auth/infrastructure/datasources/supabase-auth.datasource', () => ({
  SupabaseAuthDatasource: class {
    login = (...a: unknown[]) => login(...a);
    logout = (...a: unknown[]) => logout(...a);
    sendPhoneOtp = (...a: unknown[]) => sendPhoneOtp(...a);
    confirmPhoneOtp = (...a: unknown[]) => confirmPhoneOtp(...a);
  },
}));

// ─── Collaborators ─────────────────────────────────────────────────────────────
const finalizeAuthSession = vi.fn();
vi.mock('@features/auth/presentation/hooks/use-finalize-auth-session', () => ({
  useFinalizeAuthSession: () => finalizeAuthSession,
}));

const clearCachedAvatarUrl = vi.fn();
vi.mock('@features/profile/presentation/hooks/use-profile', () => ({
  clearCachedAvatarUrl: () => clearCachedAvatarUrl(),
}));

const setUserId = vi.fn();
vi.mock('@lib/crash-reporting', () => ({
  crashReporter: { setUserId: (...a: unknown[]) => setUserId(...a) },
}));

const sessionUser = { id: 'uid-1', email: 'a@b.c', name: 'Alice', clubId: 'co-1' };

function resetStore() {
  useAuthStore.setState({
    user: null,
    idToken: null,
    isAuthenticated: false,
    isResolvingOrg: false,
    activeClubId: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
});

// ════════════════════════════════════════════════════════════════════════════════
describe('useLogin', () => {
  it('logs in via the datasource then finalises the auth session', async () => {
    login.mockResolvedValue({ user: sessionUser, idToken: 'tok-1' });
    finalizeAuthSession.mockResolvedValue(undefined);
    const { result, rerender } = renderHook(() => useLogin());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutateAsync({ email: 'a@b.c', password: 'pw' });
    });
    rerender();

    expect(login).toHaveBeenCalledWith('a@b.c', 'pw');
    expect(finalizeAuthSession).toHaveBeenCalledWith(sessionUser, 'tok-1');
    expect(returned).toEqual({ user: sessionUser, idToken: 'tok-1' });
    expect(result.current.isSuccess).toBeTruthy();
  });

  it('surfaces the error and does not finalise when the datasource login fails', async () => {
    login.mockRejectedValue(new Error('Invalid credentials'));
    const { result, rerender } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.c', password: 'bad' }).catch(() => {});
    });
    rerender();

    expect(finalizeAuthSession).not.toHaveBeenCalled();
    expect(result.current.isError).toBeTruthy();
    expect(result.current.error).toEqual(new Error('Invalid credentials'));
  });

  it('propagates a failure in finalisation (e.g. no StarterKit account)', async () => {
    login.mockResolvedValue({ user: sessionUser, idToken: 'tok-1' });
    finalizeAuthSession.mockRejectedValue(new Error('AccountNotFound'));
    const { result, rerender } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.c', password: 'pw' }).catch(() => {});
    });
    rerender();

    expect(result.current.isError).toBeTruthy();
    expect(result.current.error).toEqual(new Error('AccountNotFound'));
  });
});

describe('useLogout', () => {
  it('signs out, clears the avatar cache, resets the crash-reporter user, and clears the store', async () => {
    useAuthStore.getState().setAuth(sessionUser, 'tok-1');
    logout.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(clearCachedAvatarUrl).toHaveBeenCalledTimes(1);
    expect(setUserId).toHaveBeenCalledWith(null);
    expect(useAuthStore.getState().isAuthenticated).toBeFalsy();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('does not clear the store when sign-out fails (onSuccess side-effects skipped)', async () => {
    useAuthStore.getState().setAuth(sessionUser, 'tok-1');
    logout.mockRejectedValue(new Error('network'));
    const { result, rerender } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.mutateAsync().catch(() => {});
    });
    rerender();

    expect(clearCachedAvatarUrl).not.toHaveBeenCalled();
    expect(setUserId).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBeTruthy();
    expect(result.current.isError).toBeTruthy();
  });
});

describe('useSendPhoneOtp', () => {
  it('forwards the phone number to the datasource and returns the ticket', async () => {
    const ticket = { phoneNumber: '+27821234567' };
    sendPhoneOtp.mockResolvedValue(ticket);
    const { result } = renderHook(() => useSendPhoneOtp());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutateAsync({ phoneNumber: '+27821234567' });
    });

    expect(sendPhoneOtp).toHaveBeenCalledWith('+27821234567');
    expect(returned).toBe(ticket);
  });

  it('surfaces the error when sending the OTP fails', async () => {
    sendPhoneOtp.mockRejectedValue(new Error('quota exceeded'));
    const { result, rerender } = renderHook(() => useSendPhoneOtp());

    await act(async () => {
      await result.current.mutateAsync({ phoneNumber: '+27000000000' }).catch(() => {});
    });
    rerender();

    expect(result.current.isError).toBeTruthy();
    expect(result.current.error).toEqual(new Error('quota exceeded'));
  });
});

describe('useVerifyOtp', () => {
  it('confirms the OTP against the stored ticket without finalising the session', async () => {
    confirmPhoneOtp.mockResolvedValue({ user: sessionUser, idToken: 'tok-1' });
    const ticket = { phoneNumber: '+27821234567' };
    const { result } = renderHook(() => useVerifyOtp());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutateAsync({ ticket, otp: '123456' });
    });

    expect(confirmPhoneOtp).toHaveBeenCalledWith(ticket, '123456');
    expect(returned).toEqual({ user: sessionUser, idToken: 'tok-1' });
    // useVerifyOtp intentionally has no onSuccess — the screen owns the auth commit.
    expect(finalizeAuthSession).not.toHaveBeenCalled();
  });

  it('surfaces the error for an invalid verification code', async () => {
    confirmPhoneOtp.mockRejectedValue(new Error('invalid-verification-code'));
    const ticket = { phoneNumber: '+27821234567' };
    const { result, rerender } = renderHook(() => useVerifyOtp());

    await act(async () => {
      await result.current.mutateAsync({ ticket, otp: '000000' }).catch(() => {});
    });
    rerender();

    expect(result.current.isError).toBeTruthy();
    expect(result.current.error).toEqual(new Error('invalid-verification-code'));
  });
});
