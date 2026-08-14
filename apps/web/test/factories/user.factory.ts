import type { User } from '@features/users/domain/entities/user';
import { AuthenticationMethod, SetupStatus } from '@/proxy/models';

export function makeUserRecord(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    clubId: 'club-1',
    avatarUrl: null,
    email: 'user@example.com',
    phoneNumber: null,
    authMethod: AuthenticationMethod.Credentials,
    displayName: 'Test User',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: null,
    dateOfBirth: null,
    position: null,
    jerseyNumber: null,
    teamIds: [],
    dependentUserIds: [],
    roles: [],
    isSharedAcrossClubs: false,
    setupStatus: SetupStatus.None,
    username: null,
    ...overrides,
  };
}
