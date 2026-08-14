import { useRequestPasswordReset } from '@features/auth/presentation/hooks/use-request-password-reset';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook } from '@/test/utils/render-hook';

const requestPasswordReset = vi.fn();
vi.mock('@features/auth/infrastructure/datasources/user-setup.datasource', () => ({
  userSetupDatasource: {
    requestPasswordReset: (...args: unknown[]) => requestPasswordReset(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useRequestPasswordReset', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useRequestPasswordReset());
    expect(result.current.isPending).toBeFalsy();
    expect(result.current.data).toBeUndefined();
  });

  it('calls the datasource with the email and exposes the returned reset link', async () => {
    requestPasswordReset.mockResolvedValue('https://app/reset?token=abc');
    const { result, rerender } = renderHook(() => useRequestPasswordReset());

    await act(async () => {
      await result.current.mutateAsync('user@example.com');
    });
    rerender();

    expect(requestPasswordReset).toHaveBeenCalledWith('user@example.com');
    expect(result.current.data).toBe('https://app/reset?token=abc');
    expect(result.current.isSuccess).toBeTruthy();
  });

  it('treats a null reset link (production response) as success', async () => {
    requestPasswordReset.mockResolvedValue(null);
    const { result, rerender } = renderHook(() => useRequestPasswordReset());

    await act(async () => {
      await result.current.mutateAsync('user@example.com');
    });
    rerender();

    expect(result.current.isSuccess).toBeTruthy();
    expect(result.current.data).toBeNull();
  });

  it('surfaces the error state when the request fails', async () => {
    requestPasswordReset.mockRejectedValue(new Error('Too many requests'));
    const { result, rerender } = renderHook(() => useRequestPasswordReset());

    await act(async () => {
      await result.current.mutateAsync('user@example.com').catch(() => {});
    });
    rerender();

    expect(result.current.isError).toBeTruthy();
    expect(result.current.error).toEqual(new Error('Too many requests'));
  });
});
