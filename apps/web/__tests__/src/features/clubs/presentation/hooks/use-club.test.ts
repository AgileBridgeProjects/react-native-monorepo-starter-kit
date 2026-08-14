import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeClub } from '@/test/factories';
import { renderHookWithProviders } from '@/test/utils/render-with-providers';

// ─── Mock datasource ──────────────────────────────────────────────────────────
vi.mock('@features/clubs/infrastructure/datasources/club-datasource', () => ({
  clubDatasource: { getById: vi.fn() },
}));

// ─── Mock query config (keep stable stale times in tests) ─────────────────────
vi.mock('@lib/http/query-config', () => ({
  queryCacheConfig: {
    list: { staleTime: 0, gcTime: 0 },
    profile: { staleTime: 0, gcTime: 0 },
  },
}));

import { clubDatasource } from '@features/clubs/infrastructure/datasources/club-datasource';
import { useClub } from '@features/clubs/presentation/hooks/use-club';

const mockGetById = vi.mocked(clubDatasource.getById);

describe('useClub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data when the datasource resolves', async () => {
    const club = makeClub({ id: 'club-1' });
    mockGetById.mockResolvedValue(club);

    const { result } = renderHookWithProviders(() => useClub('club-1'));

    await waitFor(() => expect(result.current.isSuccess).toBeTruthy());
    expect(result.current.data?.id).toBe('club-1');
    expect(mockGetById).toHaveBeenCalledWith('club-1');
  });

  it('is not enabled when id is empty', () => {
    const { result } = renderHookWithProviders(() => useClub(''));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it('surfaces errors from the datasource', async () => {
    const error = new Error('Not found');
    mockGetById.mockRejectedValue(error);

    const { result } = renderHookWithProviders(() => useClub('missing'));

    await waitFor(() => expect(result.current.isError).toBeTruthy());
    expect(result.current.error).toBe(error);
  });
});
