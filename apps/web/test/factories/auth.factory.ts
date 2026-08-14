import type { AuthUser, PhoneOtpTicket } from '@starterkit/shared';
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

/** Builds a phone OTP ticket stub for OTP tests. */
export function makeConfirmationResult(overrides: Partial<PhoneOtpTicket> = {}): PhoneOtpTicket {
  return {
    phoneNumber: '+27821234567',
    ...overrides,
  };
}

// ─── Mock Builders ────────────────────────────────────────────────────────────

export function makeMockAuthDatasource(overrides: Record<string, unknown> = {}) {
  return {
    login: vi.fn().mockResolvedValue({ user: makeUser(), idToken: 'mock-supabase-access-token' }),
    register: vi
      .fn()
      .mockResolvedValue({ user: makeUser(), idToken: 'mock-supabase-access-token' }),
    logout: vi.fn().mockResolvedValue(undefined),
    getIdToken: vi.fn().mockResolvedValue('mock-supabase-access-token'),
    getCurrentUser: vi.fn().mockReturnValue(null),
    ...overrides,
  };
}
