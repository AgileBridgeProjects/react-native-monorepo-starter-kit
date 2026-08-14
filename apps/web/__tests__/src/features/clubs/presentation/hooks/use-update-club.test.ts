import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeClub } from '@/test/factories';
import { renderHookWithProviders } from '@/test/utils/render-with-providers';

// ─── Mock datasource and grid store ──────────────────────────────────────────
vi.mock('@features/clubs/infrastructure/datasources/club-datasource', () => ({
  clubDatasource: { update: vi.fn() },
  clubStore: { reload: vi.fn() },
}));

import {
  clubDatasource,
  clubStore,
} from '@features/clubs/infrastructure/datasources/club-datasource';
import { useUpdateClub } from '@features/clubs/presentation/hooks/use-update-club';

const mockUpdate = vi.mocked(clubDatasource.update);
const mockReload = vi.mocked(clubStore.reload);

describe('useUpdateClub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls clubDatasource.update with id and fields', async () => {
    mockUpdate.mockResolvedValue(makeClub({ name: 'Renamed Co' }));

    const { result } = renderHookWithProviders(() => useUpdateClub());

    act(() =>
      result.current.mutate({
        id: 'club-1',
        name: 'Renamed Co',
        streetAddress: '1 Main St',
        city: 'Denver',
        state: 'CO',
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdate).toHaveBeenCalledWith('club-1', {
      name: 'Renamed Co',
      streetAddress: '1 Main St',
      city: 'Denver',
      state: 'CO',
    });
  });

  it('calls clubStore.reload on success', async () => {
    mockUpdate.mockResolvedValue(makeClub());

    const { result } = renderHookWithProviders(() => useUpdateClub());

    act(() =>
      result.current.mutate({
        id: 'club-1',
        name: 'New Name',
        streetAddress: '1 Main St',
        city: 'Denver',
        state: 'CO',
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('surfaces the error when datasource rejects', async () => {
    const error = new Error('Update failed');
    mockUpdate.mockRejectedValue(error);

    const { result } = renderHookWithProviders(() => useUpdateClub());

    act(() =>
      result.current.mutate({
        id: 'club-1',
        name: 'Fail',
        streetAddress: '1 Main St',
        city: 'Denver',
        state: 'CO',
      }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(mockReload).not.toHaveBeenCalled();
  });
});
