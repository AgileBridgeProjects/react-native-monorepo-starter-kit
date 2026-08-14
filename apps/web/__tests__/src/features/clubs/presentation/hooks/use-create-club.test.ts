import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeClub } from '@/test/factories';
import { renderHookWithProviders } from '@/test/utils/render-with-providers';

// ─── Mock datasource and grid store ──────────────────────────────────────────
vi.mock('@features/clubs/infrastructure/datasources/club-datasource', () => ({
  clubDatasource: { create: vi.fn() },
  clubStore: { reload: vi.fn() },
}));

import {
  clubDatasource,
  clubStore,
} from '@features/clubs/infrastructure/datasources/club-datasource';
import { useCreateClub } from '@features/clubs/presentation/hooks/use-create-club';

const mockCreate = vi.mocked(clubDatasource.create);
const mockReload = vi.mocked(clubStore.reload);

describe('useCreateClub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls clubDatasource.create with the provided input', async () => {
    mockCreate.mockResolvedValue(makeClub());

    const { result } = renderHookWithProviders(() => useCreateClub());

    act(() =>
      result.current.mutate({
        name: 'New Club',
        streetAddress: '1 Main St',
        city: 'Denver',
        state: 'CO',
        seasonStartDate: '2026-01-01',
        seasonEndDate: '2026-12-31',
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'New Club',
      streetAddress: '1 Main St',
      city: 'Denver',
      state: 'CO',
      seasonStartDate: '2026-01-01',
      seasonEndDate: '2026-12-31',
    });
  });

  it('calls clubStore.reload on success', async () => {
    mockCreate.mockResolvedValue(makeClub());

    const { result } = renderHookWithProviders(() => useCreateClub());

    act(() =>
      result.current.mutate({
        name: 'New Club',
        streetAddress: '1 Main St',
        city: 'Denver',
        state: 'CO',
        seasonStartDate: '2026-01-01',
        seasonEndDate: '2026-12-31',
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('surfaces the error when datasource rejects', async () => {
    const error = new Error('Network error');
    mockCreate.mockRejectedValue(error);

    const { result } = renderHookWithProviders(() => useCreateClub());

    act(() =>
      result.current.mutate({
        name: 'Fail Co',
        streetAddress: '1 Main St',
        city: 'Denver',
        state: 'CO',
        seasonStartDate: '2026-01-01',
        seasonEndDate: '2026-12-31',
      }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(mockReload).not.toHaveBeenCalled();
  });
});
