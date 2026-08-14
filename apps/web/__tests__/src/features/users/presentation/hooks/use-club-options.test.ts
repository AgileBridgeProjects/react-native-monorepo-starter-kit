import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithProviders } from '@/test/utils/render-with-providers';

vi.mock('@/proxy/services/clubs/clubs', () => ({
  getApiClubs: vi.fn(),
}));

vi.mock('@lib/http/query-config', () => ({
  queryCacheConfig: {
    list: { staleTime: 0, gcTime: 0 },
    profile: { staleTime: 0, gcTime: 0 },
  },
}));

import { useClubOptions } from '@features/users/presentation/hooks/use-club-options';
import { getApiClubs } from '@/proxy/services/clubs/clubs';

const mockGetApiClubs = vi.mocked(getApiClubs);

describe('useClubOptions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns mapped club options on success', async () => {
    mockGetApiClubs.mockResolvedValue({
      items: [{ id: 'club-1', name: 'Acme' }],
      totalCount: 1,
      page: 1,
      pageSize: 500,
      hasNextPage: false,
    } as never);

    const { result } = renderHookWithProviders(() => useClubOptions());

    await waitFor(() => expect(result.current.isSuccess).toBeTruthy());
    expect(result.current.data).toEqual([{ id: 'club-1', name: 'Acme' }]);
    expect(mockGetApiClubs).toHaveBeenCalledWith();
  });

  it('surfaces errors from the proxy', async () => {
    mockGetApiClubs.mockRejectedValue(new Error('Network error'));

    const { result } = renderHookWithProviders(() => useClubOptions());

    await waitFor(() => expect(result.current.isError).toBeTruthy());
  });
});
