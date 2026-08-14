import { useChangePassword } from '@features/auth/presentation/hooks/use-change-password';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook } from '@/test/utils/render-hook';

const changePassword = vi.fn();
vi.mock('@features/auth/infrastructure/datasources/user-setup.datasource', () => ({
  userSetupDatasource: { changePassword: (...args: unknown[]) => changePassword(...args) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useChangePassword', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useChangePassword());
    expect(result.current.isPending).toBeFalsy();
    expect(result.current.isSuccess).toBeFalsy();
    expect(result.current.isError).toBeFalsy();
  });

  it('calls the datasource with the new password and resolves on success', async () => {
    changePassword.mockResolvedValue(undefined);
    const { result, rerender } = renderHook(() => useChangePassword());

    await act(async () => {
      await result.current.mutateAsync('NewSecret123!');
    });
    rerender();

    expect(changePassword).toHaveBeenCalledWith('NewSecret123!');
    expect(result.current.isSuccess).toBeTruthy();
  });

  it('surfaces the error state when the datasource rejects', async () => {
    changePassword.mockRejectedValue(new Error('Password reuse not allowed'));
    const { result, rerender } = renderHook(() => useChangePassword());

    await act(async () => {
      await result.current.mutateAsync('reused').catch(() => {});
    });
    rerender();

    expect(result.current.isError).toBeTruthy();
    expect(result.current.error).toEqual(new Error('Password reuse not allowed'));
  });
});
