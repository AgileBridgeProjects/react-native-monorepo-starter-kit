import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithProviders } from '@/test/utils/render-with-providers';

// ─── Mock datasource and grid store ──────────────────────────────────────────
vi.mock('@features/clubs/infrastructure/datasources/club-datasource', () => ({
  clubDatasource: { delete: vi.fn() },
  clubStore: { reload: vi.fn() },
}));

import {
  clubDatasource,
  clubStore,
} from '@features/clubs/infrastructure/datasources/club-datasource';
import { useDeleteClub } from '@features/clubs/presentation/hooks/use-delete-club';

const mockDelete = vi.mocked(clubDatasource.delete);
const mockReload = vi.mocked(clubStore.reload);

describe('useDeleteClub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls clubDatasource.delete with the club id', async () => {
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderHookWithProviders(() => useDeleteClub());

    act(() => result.current.mutate('club-1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('club-1');
  });

  it('calls clubStore.reload on success', async () => {
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderHookWithProviders(() => useDeleteClub());

    act(() => result.current.mutate('club-1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('surfaces the error when datasource rejects', async () => {
    const error = new Error('Delete failed');
    mockDelete.mockRejectedValue(error);

    const { result } = renderHookWithProviders(() => useDeleteClub());

    act(() => result.current.mutate('club-1'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(mockReload).not.toHaveBeenCalled();
  });
});
