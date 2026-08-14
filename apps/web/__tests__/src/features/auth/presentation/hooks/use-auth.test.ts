import { useAuthStore } from '@store/auth-store';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeUser } from '@/test/factories';
import { renderHookWithProviders } from '@/test/utils/render-with-providers';

// ─── Mock SupabaseAuthDatasource at module level ──────────────────────────────
// use-auth.ts instantiates new SupabaseAuthDatasource() at module scope,
// so the class must be mocked before the module is imported.
// vi.hoisted() ensures mockDatasource is evaluated BEFORE vi.mock() factories run.
const mockDatasource = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  sendPhoneOtp: vi.fn(),
  confirmPhoneOtp: vi.fn(),
}));

vi.mock('@features/auth/infrastructure/datasources/supabase-auth.datasource', () => ({
  SupabaseAuthDatasource: vi.fn().mockImplementation(() => mockDatasource),
}));

const mockRevokeAndSignOut = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@features/auth/infrastructure/revoke-session', () => ({
  revokeAndSignOut: () => mockRevokeAndSignOut(),
}));

import {
  useLogin,
  useLogout,
  useSendPhoneOtp,
  useVerifyOtp,
} from '@features/auth/presentation/hooks/use-auth';

describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, idToken: null, isAuthenticated: false, isHydrated: false });
  });

  it('calls datasource.login with email and password', async () => {
    mockDatasource.login.mockResolvedValue({ user: makeUser(), idToken: 'token' });

    const { result } = renderHookWithProviders(() => useLogin());
    act(() => result.current.mutate({ email: 'alice@example.com', password: 'secret' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDatasource.login).toHaveBeenCalledWith('alice@example.com', 'secret');
  });

  it('stores user and token in auth store on success', async () => {
    const user = makeUser();
    mockDatasource.login.mockResolvedValue({ user, idToken: 'fire-token' });

    const { result } = renderHookWithProviders(() => useLogin());
    act(() => result.current.mutate({ email: 'alice@example.com', password: 'secret' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().idToken).toBe('fire-token');
  });

  it('surfaces the error when datasource rejects', async () => {
    mockDatasource.login.mockRejectedValue(new Error('invalid credentials'));

    const { result } = renderHookWithProviders(() => useLogin());
    act(() => result.current.mutate({ email: 'bad@example.com', password: 'wrong' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('invalid credentials');
  });
});

describe('useLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setAuth(makeUser(), 'fire-token');
  });

  it('calls revokeAndSignOut', async () => {
    const { result } = renderHookWithProviders(() => useLogout());
    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRevokeAndSignOut).toHaveBeenCalled();
  });

  it('clears the auth store on success', async () => {
    const { result } = renderHookWithProviders(() => useLogout());
    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('useSendPhoneOtp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls datasource.sendPhoneOtp with the phone number', async () => {
    mockDatasource.sendPhoneOtp.mockResolvedValue({ phoneNumber: '+27821234567' });

    const { result } = renderHookWithProviders(() => useSendPhoneOtp());
    act(() => result.current.mutate({ phoneNumber: '+27821234567' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDatasource.sendPhoneOtp).toHaveBeenCalledWith('+27821234567');
  });
});

describe('useVerifyOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, idToken: null, isAuthenticated: false, isHydrated: false });
  });

  it('calls datasource.confirmPhoneOtp and stores auth on success', async () => {
    const user = makeUser();
    const ticket = { phoneNumber: '+27821234567' };
    mockDatasource.confirmPhoneOtp.mockResolvedValue({ user, idToken: 'phone-token' });

    const { result } = renderHookWithProviders(() => useVerifyOtp());
    act(() => result.current.mutate({ ticket, otp: '123456' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDatasource.confirmPhoneOtp).toHaveBeenCalledWith(ticket, '123456');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('surfaces the error when datasource rejects', async () => {
    const ticket = { phoneNumber: '+27821234567' };
    mockDatasource.confirmPhoneOtp.mockRejectedValue(new Error('invalid otp'));

    const { result } = renderHookWithProviders(() => useVerifyOtp());
    act(() => result.current.mutate({ ticket, otp: '000000' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('invalid otp');
  });
});
