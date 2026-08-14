import { resolveGoogleSignInStrategy } from '@features/auth/presentation/hooks/use-google-sign-in';
import { describe, expect, it, vi } from 'vitest';

// The hook module touches native-only deps at import time; stub them so the pure
// strategy resolver can be imported and tested in isolation.
vi.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: vi.fn() }));
vi.mock('expo-auth-session', () => ({ exchangeCodeAsync: vi.fn() }));
vi.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [null, null, vi.fn()],
  discovery: { tokenEndpoint: 'https://oauth2.googleapis.com/token' },
}));
vi.mock('expo-linking', () => ({
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  parse: vi.fn(() => ({ queryParams: {} })),
}));

describe('resolveGoogleSignInStrategy', () => {
  it('uses Google Identity Services on web regardless of GMS', () => {
    expect(resolveGoogleSignInStrategy('web', true)).toBe('web-gis');
    expect(resolveGoogleSignInStrategy('web', false)).toBe('web-gis');
  });

  it('uses the native SDK on GMS-equipped native platforms', () => {
    expect(resolveGoogleSignInStrategy('android', true)).toBe('native-sdk');
    expect(resolveGoogleSignInStrategy('ios', true)).toBe('native-sdk');
  });

  it('falls back to system-browser OAuth on GMS-less native (Huawei)', () => {
    expect(resolveGoogleSignInStrategy('android', false)).toBe('web-oauth');
    expect(resolveGoogleSignInStrategy('ios', false)).toBe('web-oauth');
  });
});
