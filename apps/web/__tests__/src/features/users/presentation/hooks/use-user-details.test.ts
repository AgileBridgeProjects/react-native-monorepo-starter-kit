import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithProviders } from '@/test/utils/render-with-providers';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/proxy/services/users/users', () => ({
  getApiUsersId: vi.fn(),
}));

import { useUserDetails } from '@features/users/presentation/hooks/use-user-details';
import { AuthenticationMethod, SetupStatus } from '@/proxy/models';
import { getApiUsersId } from '@/proxy/services/users/users';
import { makeUserRecord } from '@/test/factories/user.factory';

const mockGetById = vi.mocked(getApiUsersId);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useUserDetails', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not fetch when disabled', () => {
    renderHookWithProviders(() => useUserDetails('user-1', false));

    expect(mockGetById).not.toHaveBeenCalled();
  });

  it('does not fetch when userId is undefined, even if enabled', () => {
    renderHookWithProviders(() => useUserDetails(undefined, true));

    expect(mockGetById).not.toHaveBeenCalled();
  });

  it('fetches the user by id when enabled with a userId', async () => {
    mockGetById.mockResolvedValue({
      id: 'user-1',
      clubId: 'club-1',
      displayName: 'Test User',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      authMethod: AuthenticationMethod.Credentials,
      setupStatus: SetupStatus.None,
      teamIds: ['team-1', 'team-2'],
      dependentUserIds: [],
    } as never);

    const { result } = renderHookWithProviders(() => useUserDetails('user-1', true));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetById).toHaveBeenCalledWith('user-1');
    expect(result.current.data?.teamIds).toEqual(['team-1', 'team-2']);
  });

  it('maps the response through the User domain mapper (teamIds/dependentUserIds present)', async () => {
    const record = makeUserRecord({
      id: 'user-2',
      teamIds: ['team-a'],
      dependentUserIds: ['dep-a', 'dep-b'],
    });
    mockGetById.mockResolvedValue({
      id: record.id,
      clubId: record.clubId,
      displayName: record.displayName,
      isActive: record.isActive,
      createdAt: record.createdAt,
      authMethod: record.authMethod,
      setupStatus: record.setupStatus,
      teamIds: record.teamIds,
      dependentUserIds: record.dependentUserIds,
    } as never);

    const { result } = renderHookWithProviders(() => useUserDetails('user-2', true));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.dependentUserIds).toEqual(['dep-a', 'dep-b']);
  });
});
