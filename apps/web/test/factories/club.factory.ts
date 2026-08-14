import type { Club } from '@features/clubs/domain/entities/club';

export function makeClub(overrides: Partial<Club> = {}): Club {
  return {
    id: 'club-1',
    name: 'Acme Corp',
    streetAddress: '123 Main St',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    timezone: null,
    maxAthletes: null,
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-02T00:00:00Z',
    updatedBy: 'user-1',
    isDeleted: false,
    logoUrl: null,
    activeUserCount: null,
    teamCount: null,
    ...overrides,
  };
}

export function makeClubListResult(
  overrides: Partial<{
    items: Club[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasNextPage: boolean;
  }> = {},
) {
  return {
    items: [makeClub()],
    totalCount: 1,
    page: 1,
    pageSize: 25,
    hasNextPage: false,
    ...overrides,
  };
}
