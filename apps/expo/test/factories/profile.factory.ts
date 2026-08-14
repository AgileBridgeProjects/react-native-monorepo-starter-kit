import type { HelpRequestPayload } from '@features/profile/infrastructure/help.datasource';
import type { UserProfileResponse } from '@/src/proxy/models/userProfileResponse';

// ─── Profile fixtures ─────────────────────────────────────────────────────────

export function makeUserProfile(overrides: Partial<UserProfileResponse> = {}): UserProfileResponse {
  return {
    id: 'user-1',
    displayName: 'Alex Johnson',
    email: 'alex@example.com',
    avatarUrl: null,
    clubName: 'Acme Corp',
    teamIds: [],
    gamesPlayed: 0,
    gamesPassed: 0,
    totalSessions: 0,
    totalAssignedGames: 0,
    joinedAt: '2024-01-15T10:00:00.000Z',
    authMethod: 'Credentials',
    isCoach: false,
    position: null,
    jerseyNumber: null,
    fullBodyPhotoUrl: null,
    facePhotoUrl: null,
    onboardingCompletedAt: null,
    roles: [],
    onboardingRole: null,
    ...overrides,
  };
}

// ─── Help request fixtures ──────────────────────────────────────────────────--

export function makeHelpRequest(overrides: Partial<HelpRequestPayload> = {}): HelpRequestPayload {
  return {
    subject: 'Need help',
    body: 'I have a question about the app.',
    ...overrides,
  };
}
