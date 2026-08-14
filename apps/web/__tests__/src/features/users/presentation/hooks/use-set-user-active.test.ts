import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithProviders } from '@/test/utils/render-with-providers';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/proxy/services/users/users', () => ({
  patchApiUsersIdStatus: vi.fn(),
}));

import { useSetUserActive } from '@features/users/presentation/hooks/use-set-user-active';
import { patchApiUsersIdStatus } from '@/proxy/services/users/users';

const mockPatch = vi.mocked(patchApiUsersIdStatus);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useSetUserActive', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is idle before mutate is called', () => {
    const { result } = renderHookWithProviders(() => useSetUserActive());

    expect(result.current.status).toBe('idle');
  });

  it('calls patchApiUsersIdStatus with the correct id and isActive=false (suspend)', async () => {
    mockPatch.mockResolvedValue(undefined as never);

    const { result } = renderHookWithProviders(() => useSetUserActive());

    result.current.mutate({ id: 'user-1', isActive: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPatch).toHaveBeenCalledOnce();
    expect(mockPatch).toHaveBeenCalledWith('user-1', { isActive: false });
  });

  it('calls patchApiUsersIdStatus with isActive=true (activate)', async () => {
    mockPatch.mockResolvedValue(undefined as never);

    const { result } = renderHookWithProviders(() => useSetUserActive());

    result.current.mutate({ id: 'user-2', isActive: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPatch).toHaveBeenCalledWith('user-2', { isActive: true });
  });

  it('transitions to error state when the API call fails', async () => {
    mockPatch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHookWithProviders(() => useSetUserActive());

    result.current.mutate({ id: 'user-1', isActive: false });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
