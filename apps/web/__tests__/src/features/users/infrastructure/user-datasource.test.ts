import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('@/proxy/services/users/users', () => ({
  getApiUsers: vi.fn(),
}));

vi.mock('@features/clubs/infrastructure/datasources/team-datasource', () => ({
  teamDatasource: {
    list: vi.fn(),
  },
}));

vi.mock('@lib/http/create-grid-store', () => ({
  createGridStore: vi.fn(() => ({ reload: vi.fn() })),
}));

import { teamDatasource } from '@features/clubs/infrastructure/datasources/team-datasource';
import { userDatasource } from '@features/users/infrastructure/datasources/user-datasource';
import { AuthenticationMethod, SetupStatus } from '@/proxy/models';
import { getApiUsers } from '@/proxy/services/users/users';

const mockGetApiUsers = vi.mocked(getApiUsers);
const mockTeamDatasource = vi.mocked(teamDatasource);

const baseResponse = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 25,
  hasNextPage: false,
};

describe('userDatasource', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('list', () => {
    it('maps UserResponse to User domain entity', async () => {
      mockGetApiUsers.mockResolvedValue({
        ...baseResponse,
        items: [
          {
            id: 'user-1',
            clubId: 'club-1',
            teamIds: ['dept-1'],
            email: 'test@example.com',
            displayName: 'Test User',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            lastLoginAt: null,
            roles: ['Coach'],
          },
        ],
        totalCount: 1,
      } as never);

      const result = await userDatasource.list(1, 25);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 'user-1',
        clubId: 'club-1',
        avatarUrl: null,
        email: 'test@example.com',
        phoneNumber: null,
        username: null,
        authMethod: AuthenticationMethod.Credentials,
        displayName: 'Test User',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        lastLoginAt: null,
        dateOfBirth: null,
        position: null,
        jerseyNumber: null,
        teamIds: ['dept-1'],
        dependentUserIds: [],
        roles: ['Coach'],
        isSharedAcrossClubs: false,
        setupStatus: SetupStatus.None,
      });
    });

    it('forwards clubId and teamId filter to proxy', async () => {
      mockGetApiUsers.mockResolvedValue({ ...baseResponse } as never);

      await userDatasource.list(1, 25, undefined, undefined, {
        clubId: 'club-1',
        teamId: 'dept-2',
      });

      expect(mockGetApiUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          ClubId: 'club-1',
          TeamId: 'dept-2',
        }),
      );
    });

    it('throws when UserResponse is missing required fields', async () => {
      mockGetApiUsers.mockResolvedValue({
        ...baseResponse,
        items: [{ id: null, clubId: null, email: null, displayName: null, createdAt: null }],
        totalCount: 1,
      } as never);

      await expect(userDatasource.list(1, 25)).rejects.toThrow(
        'UserResponse missing required fields',
      );
    });
  });

  describe('listTeams', () => {
    it('delegates to teamDatasource and maps results', async () => {
      mockTeamDatasource.list.mockResolvedValue({
        items: [
          {
            id: 'dept-1',
            name: 'Engineering',
            clubId: 'club-1',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 500,
        hasNextPage: false,
      } as never);

      const result = await userDatasource.listTeams('club-1');

      expect(mockTeamDatasource.list).toHaveBeenCalledWith('club-1', 1, 500);
      expect(result).toEqual([{ id: 'dept-1', name: 'Engineering' }]);
    });
  });
});
