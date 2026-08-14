import { uiConfig } from '@lib/ui-config';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAthleteSelectStore } from '@/lib/hooks/use-athlete-select-store';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockCreateSelectStore } = vi.hoisted(() => ({
  mockCreateSelectStore: vi.fn(() => ({ __brand: 'store' })),
}));

vi.mock('@/lib/http/create-select-store', () => ({
  createSelectStore: mockCreateSelectStore,
}));

vi.mock('@/proxy/services/users/users', () => ({
  getApiUsers: vi.fn(),
  getApiUsersId: vi.fn(),
}));

import { getApiUsers } from '@/proxy/services/users/users';

const mockGetApiUsers = vi.mocked(getApiUsers);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAthleteSelectStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when clubId is undefined', () => {
    it('returns undefined (store disabled)', () => {
      const { result } = renderHook(() => useAthleteSelectStore(undefined));
      expect(result.current).toBeUndefined();
      expect(mockCreateSelectStore).not.toHaveBeenCalled();
    });
  });

  describe('when clubId is null', () => {
    it('returns undefined (store disabled)', () => {
      const { result } = renderHook(() => useAthleteSelectStore(null));
      expect(result.current).toBeUndefined();
      expect(mockCreateSelectStore).not.toHaveBeenCalled();
    });
  });

  describe('when clubId is a string', () => {
    it('returns a store and fetches Athlete-role users scoped to the club', () => {
      const { result } = renderHook(() => useAthleteSelectStore('club-abc'));

      expect(result.current).toBeDefined();
      expect(mockCreateSelectStore).toHaveBeenCalledOnce();

      const calls = mockCreateSelectStore.mock.calls as unknown as Array<
        [(f?: string) => void, unknown]
      >;
      // biome-ignore lint/style/noNonNullAssertion: test assertion — calls[0] is guaranteed by the mock setup above
      const [fetcher] = calls[0]!;
      fetcher('search');
      expect(mockGetApiUsers).toHaveBeenCalledWith({
        ClubId: 'club-abc',
        RoleName: 'Athlete',
        FilterText: 'search',
        Page: 1,
        PageSize: uiConfig.selectSearch.pageSize,
      });
    });

    it('falls back to the default page size when take is 0', () => {
      renderHook(() => useAthleteSelectStore('club-abc'));

      const calls = mockCreateSelectStore.mock.calls as unknown as Array<
        [(f?: string, skip?: number, take?: number) => void, unknown]
      >;
      // biome-ignore lint/style/noNonNullAssertion: test assertion — calls[0] is guaranteed by the mock setup above
      const [fetcher] = calls[0]!;
      fetcher('search', 0, 0);

      expect(mockGetApiUsers).toHaveBeenCalledWith({
        ClubId: 'club-abc',
        RoleName: 'Athlete',
        FilterText: 'search',
        Page: 1,
        PageSize: uiConfig.selectSearch.pageSize,
      });
    });
  });
});
