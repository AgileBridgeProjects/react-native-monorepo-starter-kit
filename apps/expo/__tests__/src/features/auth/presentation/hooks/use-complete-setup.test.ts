import { useCompleteSetup } from '@features/auth/presentation/hooks/use-complete-setup';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompleteSetupRequest } from '@/src/proxy/models';

import { renderHook } from '@/test/utils/render-hook';

const completeSetup = vi.fn();
vi.mock('@features/auth/infrastructure/datasources/user-setup.datasource', () => ({
  userSetupDatasource: { completeSetup: (...args: unknown[]) => completeSetup(...args) },
}));

const input: CompleteSetupRequest = { token: 'tok-1', newPassword: 'Secret123!' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCompleteSetup', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useCompleteSetup());
    expect(result.current.isPending).toBeFalsy();
    expect(result.current.isSuccess).toBeFalsy();
  });

  it('forwards the full request payload to the datasource on success', async () => {
    completeSetup.mockResolvedValue(undefined);
    const { result, rerender } = renderHook(() => useCompleteSetup());

    await act(async () => {
      await result.current.mutateAsync(input);
    });
    rerender();

    expect(completeSetup).toHaveBeenCalledWith(input);
    expect(result.current.isSuccess).toBeTruthy();
  });

  it('surfaces the error state when setup completion fails', async () => {
    completeSetup.mockRejectedValue(new Error('Token expired'));
    const { result, rerender } = renderHook(() => useCompleteSetup());

    await act(async () => {
      await result.current.mutateAsync(input).catch(() => {});
    });
    rerender();

    expect(result.current.isError).toBeTruthy();
    expect(result.current.error).toEqual(new Error('Token expired'));
  });
});
