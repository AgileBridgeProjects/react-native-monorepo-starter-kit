import type { AuthUser } from '@features/auth/domain/auth.types';
import { vi } from 'vitest';

// ─── Domain Fixtures ─────────────────────────────────────────────────────────

export function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice Smith',
    avatarUrl: 'https://example.com/avatar.jpg',
    ...overrides,
  };
}

// ─── DTO Fixtures (wire format — for MSW handlers and datasource tests) ──────

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

export interface AuthResponseDto {
  user: AuthUserDto;
  access_token: string;
  refresh_token: string;
}

export interface RefreshResponseDto {
  access_token: string;
  refresh_token: string;
}

export function makeUserDto(overrides: Partial<AuthUserDto> = {}): AuthUserDto {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice Smith',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

export function makeAuthResponseDto(overrides: Partial<AuthResponseDto> = {}): AuthResponseDto {
  return {
    user: makeUserDto(),
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    ...overrides,
  };
}

export function makeRefreshResponseDto(
  overrides: Partial<RefreshResponseDto> = {},
): RefreshResponseDto {
  return {
    access_token: 'refreshed-access-token',
    refresh_token: 'refreshed-refresh-token',
    ...overrides,
  };
}

// ─── Linked organisation (select-org screen) ────────────────────────────────

export interface LinkedOrg {
  clubId: string;
  clubName: string;
  clubLogoUrl?: string | null;
}

export function makeLinkedOrg(overrides: Partial<LinkedOrg> = {}): LinkedOrg {
  return {
    clubId: 'club-1',
    clubName: 'Acme Corp',
    clubLogoUrl: null,
    ...overrides,
  };
}

// ─── Mock Builders ───────────────────────────────────────────────────────────

export function makeMockAuthDataSource(overrides: Record<string, unknown> = {}) {
  return {
    login: vi.fn().mockResolvedValue({ user: makeUser(), idToken: 'mock-firebase-id-token' }),
    register: vi.fn().mockResolvedValue({ user: makeUser(), idToken: 'mock-firebase-id-token' }),
    logout: vi.fn().mockResolvedValue(undefined),
    getIdToken: vi.fn().mockResolvedValue('mock-firebase-id-token'),
    getCurrentUser: vi.fn().mockReturnValue(null),
    ...overrides,
  };
}
