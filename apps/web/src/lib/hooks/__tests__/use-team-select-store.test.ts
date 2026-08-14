import { uiConfig } from '@lib/ui-config';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTeamSelectStore } from '../use-team-select-store';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockCreateSelectStore } = vi.hoisted(() => ({
  mockCreateSelectStore: vi.fn(() => ({ __brand: 'store' })),
}));

vi.mock('@/lib/http/create-select-store', () => ({
  createSelectStore: mockCreateSelectStore,
}));

vi.mock('@/proxy/services/teams/teams', () => ({
  getApiTeams: vi.fn(),
  getApiTeamsId: vi.fn(),
}));

import { getApiTeams } from '@/proxy/services/teams/teams';

const mockGetApiTeams = vi.mocked(getApiTeams);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useTeamSelectStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when clubId is undefined', () => {
    it('returns undefined (store disabled)', () => {
      const { result } = renderHook(() => useTeamSelectStore(undefined));
      expect(result.current).toBeUndefined();
      expect(mockCreateSelectStore).not.toHaveBeenCalled();
    });
  });

  describe('when clubId is a string', () => {
    it('returns a store and fetches with ClubId filter', () => {
      const { result } = renderHook(() => useTeamSelectStore('club-abc'));

      expect(result.current).toBeDefined();
      expect(mockCreateSelectStore).toHaveBeenCalledOnce();

      // Verify the fetcher calls the API with the club filter
      const calls = mockCreateSelectStore.mock.calls as unknown as Array<
        [(f?: string) => void, unknown]
      >;
      // biome-ignore lint/style/noNonNullAssertion: test assertion — calls[0] is guaranteed by the mock setup above
      const [fetcher] = calls[0]!;
      fetcher('search');
      expect(mockGetApiTeams).toHaveBeenCalledWith({
        ClubId: 'club-abc',
        FilterText: 'search',
        Page: 1,
        PageSize: uiConfig.selectSearch.pageSize,
      });
    });
  });

  describe('when clubId is null (SuperAdmin — no club assignment)', () => {
    it('returns a store and fetches without a ClubId filter', () => {
      const { result } = renderHook(() => useTeamSelectStore(null));

      expect(result.current).toBeDefined();
      expect(mockCreateSelectStore).toHaveBeenCalledOnce();

      // Verify the fetcher calls the API WITHOUT a club filter
      const calls = mockCreateSelectStore.mock.calls as unknown as Array<
        [(f?: string) => void, unknown]
      >;
      // biome-ignore lint/style/noNonNullAssertion: test assertion — calls[0] is guaranteed by the mock setup above
      const [fetcher] = calls[0]!;
      fetcher('search');
      expect(mockGetApiTeams).toHaveBeenCalledWith({
        FilterText: 'search',
        Page: 1,
        PageSize: uiConfig.selectSearch.pageSize,
      });
    });
  });
});
