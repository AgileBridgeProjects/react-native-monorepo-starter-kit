import { useCurrentSession } from '@features/auth/presentation/hooks/use-current-session';
import { useAuthStore } from '@store/auth-store';
import type { AuthUser } from '@starterkit/shared';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderHook } from '@/test/utils/render-hook';

function resetStore() {
  useAuthStore.setState({
    user: null,
    idToken: null,
    isAuthenticated: false,
    isResolvingOrg: false,
    activeClubId: null,
    permissions: new Set(),
  });
}

const fullUser: AuthUser = {
  id: 'uid-1',
  email: 'alice@example.com',
  name: 'Alice Smith',
  avatarUrl: 'https://example.com/a.png',
  clubId: 'co-1',
};

beforeEach(resetStore);

describe('useCurrentSession', () => {
  it('returns an unauthenticated session with null fields when no user is set', () => {
    const { result } = renderHook(() => useCurrentSession());

    expect(result.current).toMatchObject({
      isAuthenticated: false,
      userId: null,
      email: null,
      displayName: null,
      avatarUrl: null,
      clubId: null,
    });
  });

  it('maps every field from the authenticated user', () => {
    act(() => {
      useAuthStore.getState().setAuth(fullUser, 'token-1');
    });
    const { result } = renderHook(() => useCurrentSession());

    expect(result.current).toMatchObject({
      isAuthenticated: true,
      userId: 'uid-1',
      email: 'alice@example.com',
      displayName: 'Alice Smith',
      avatarUrl: 'https://example.com/a.png',
      clubId: 'co-1',
    });
  });

  it('coalesces missing optional user fields to null', () => {
    act(() => {
      useAuthStore
        .getState()
        .setAuth({ id: 'uid-2', email: 'bob@example.com', name: 'Bob' }, 'token-2');
    });
    const { result } = renderHook(() => useCurrentSession());

    expect(result.current.avatarUrl).toBeNull();
    expect(result.current.clubId).toBeNull();
    expect(result.current.isAuthenticated).toBeTruthy();
    expect(result.current.userId).toBe('uid-2');
  });

  it('reflects a logout transition on re-render', () => {
    act(() => {
      useAuthStore.getState().setAuth(fullUser, 'token-1');
    });
    const { result, rerender } = renderHook(() => useCurrentSession());
    expect(result.current.isAuthenticated).toBeTruthy();

    act(() => {
      useAuthStore.getState().logout();
    });
    rerender();

    expect(result.current.isAuthenticated).toBeFalsy();
    expect(result.current.userId).toBeNull();
    expect(result.current.clubId).toBeNull();
  });

  describe('hasPermission', () => {
    it('returns false when the store has no permissions', () => {
      const { result } = renderHook(() => useCurrentSession());

      expect(result.current.hasPermission('StarterKit.CheckIns.Access')).toBe(false);
    });

    it('returns true only for a permission present in the store', () => {
      act(() => {
        useAuthStore.getState().setPermissions(new Set(['StarterKit.CheckIns.Access']));
      });
      const { result } = renderHook(() => useCurrentSession());

      expect(result.current.hasPermission('StarterKit.CheckIns.Access')).toBe(true);
      expect(result.current.hasPermission('StarterKit.Reports.View')).toBe(false);
    });
  });
});
