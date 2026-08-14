import { useCurrentSession } from '@features/auth/presentation/hooks/use-current-session';
import { useAuthStore } from '@store/auth-store';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeUser } from '@/test/factories';

describe('useCurrentSession', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      idToken: null,
      isAuthenticated: false,
      isHydrated: false,
      resolvedClubId: null,
    });
  });

  it('returns isAuthenticated false and all nulls when no user is set', () => {
    const { result } = renderHook(() => useCurrentSession());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userId).toBeNull();
    expect(result.current.email).toBeNull();
    expect(result.current.displayName).toBeNull();
    expect(result.current.avatarUrl).toBeNull();
    expect(result.current.clubId).toBeNull();
  });

  it('returns populated session when user is authenticated', () => {
    const user = makeUser({ clubId: 'club-42' });
    useAuthStore.getState().setAuth(user, 'token');
    useAuthStore.getState().setResolvedClubId('club-42');

    const { result } = renderHook(() => useCurrentSession());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userId).toBe('user-1');
    expect(result.current.email).toBe('alice@example.com');
    expect(result.current.displayName).toBe('Alice Smith');
    expect(result.current.avatarUrl).toBe('https://example.com/avatar.jpg');
    expect(result.current.clubId).toBe('club-42');
  });

  it('returns clubId null when user has no clubId', () => {
    const user = makeUser({ clubId: undefined });
    useAuthStore.getState().setAuth(user, 'token');

    const { result } = renderHook(() => useCurrentSession());

    expect(result.current.clubId).toBeNull();
  });

  it('reflects store updates reactively', () => {
    const { result, rerender } = renderHook(() => useCurrentSession());

    expect(result.current.isAuthenticated).toBe(false);

    act(() => {
      useAuthStore.getState().setAuth(makeUser(), 'new-token');
    });
    rerender();

    expect(result.current.isAuthenticated).toBe(true);
  });
});
