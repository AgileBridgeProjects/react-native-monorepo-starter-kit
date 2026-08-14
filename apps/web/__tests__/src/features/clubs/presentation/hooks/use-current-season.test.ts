import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithProviders } from '@/test/utils/render-with-providers';

// ─── Mock datasource ──────────────────────────────────────────────────────────
vi.mock('@features/clubs/infrastructure/datasources/season-datasource', () => ({
  seasonDatasource: { getCurrent: vi.fn() },
}));

// ─── Mock query config (keep stable stale times in tests) ─────────────────────
vi.mock('@lib/http/query-config', () => ({
  queryCacheConfig: {
    static: { staleTime: 0, gcTime: 0 },
  },
}));

import { seasonDatasource } from '@features/clubs/infrastructure/datasources/season-datasource';
import { useCurrentSeason } from '@features/clubs/presentation/hooks/use-current-season';

const mockGetCurrent = vi.mocked(seasonDatasource.getCurrent);

describe('useCurrentSeason', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data when the datasource resolves', async () => {
    mockGetCurrent.mockResolvedValue({
      id: 'season-1',
      clubId: 'club-1',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      displayLabel: '2026 Season',
    });

    const { result } = renderHookWithProviders(() => useCurrentSeason('club-1'));

    await waitFor(() => expect(result.current.isSuccess).toBeTruthy());
    expect(result.current.data?.id).toBe('season-1');
    expect(mockGetCurrent).toHaveBeenCalledWith('club-1');
  });

  it('is not enabled when clubId is null', () => {
    const { result } = renderHookWithProviders(() => useCurrentSeason(null));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetCurrent).not.toHaveBeenCalled();
  });

  it('surfaces errors from the datasource', async () => {
    const error = new Error('Failed to resolve season');
    mockGetCurrent.mockRejectedValue(error);

    const { result } = renderHookWithProviders(() => useCurrentSeason('club-1'));

    await waitFor(() => expect(result.current.isError).toBeTruthy());
    expect(result.current.error).toBe(error);
  });
});
