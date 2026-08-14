import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithProviders } from '@/test/utils/render-with-providers';

vi.mock('@features/users/infrastructure/datasources/user-datasource', () => ({
  userDatasource: { listTeams: vi.fn() },
  createUserGridStore: vi.fn(() => ({ reload: vi.fn() })),
}));

vi.mock('@lib/http/query-config', () => ({
  queryCacheConfig: {
    list: { staleTime: 0, gcTime: 0 },
    profile: { staleTime: 0, gcTime: 0 },
  },
}));

import { userDatasource } from '@features/users/infrastructure/datasources/user-datasource';
import { useTeamOptions } from '@features/users/presentation/hooks/use-team-options';

const mockListTeams = vi.mocked(userDatasource.listTeams);

describe('useTeamOptions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns mapped team options when clubId is provided', async () => {
    mockListTeams.mockResolvedValue([{ id: 'dept-1', name: 'Engineering' }]);

    const { result } = renderHookWithProviders(() => useTeamOptions('club-1'));

    await waitFor(() => expect(result.current.isSuccess).toBeTruthy());
    expect(result.current.data).toEqual([{ id: 'dept-1', name: 'Engineering' }]);
    expect(mockListTeams).toHaveBeenCalledWith('club-1');
  });

  it('is disabled when clubId is null', () => {
    const { result } = renderHookWithProviders(() => useTeamOptions(null));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListTeams).not.toHaveBeenCalled();
  });
});
