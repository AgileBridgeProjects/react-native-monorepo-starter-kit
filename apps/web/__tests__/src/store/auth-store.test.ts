import { authStoreUtils, useAuthStore } from '@store/auth-store';
import { beforeEach, describe, expect, it } from 'vitest';

import { makeUser } from '@/test/factories';

describe('useAuthStore (web)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      idToken: null,
      isAuthenticated: false,
      isHydrated: false,
    });
  });

  it('starts unauthenticated and unhydrated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isHydrated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.idToken).toBeNull();
  });

  it('setAuth stores user, idToken, and sets isAuthenticated', () => {
    const user = makeUser();
    useAuthStore.getState().setAuth(user, 'firebase-id-token');

    const state = useAuthStore.getState();
    expect(state.user).toBe(user);
    expect(state.idToken).toBe('firebase-id-token');
    expect(state.isAuthenticated).toBe(true);
  });

  it('setAuth stores clubId from the user object', () => {
    const user = makeUser({ clubId: 'club-abc' });
    useAuthStore.getState().setAuth(user, 'token');

    expect(useAuthStore.getState().user?.clubId).toBe('club-abc');
  });

  it('logout clears user, idToken, and isAuthenticated', () => {
    useAuthStore.getState().setAuth(makeUser(), 'firebase-token');
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.idToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('setHydrated marks store as hydrated', () => {
    useAuthStore.getState().setHydrated(true);
    expect(useAuthStore.getState().isHydrated).toBe(true);
  });

  describe('authStoreUtils', () => {
    it('getIdToken returns the current Firebase idToken', () => {
      useAuthStore.getState().setAuth(makeUser(), 'firebase-token');
      expect(authStoreUtils.getIdToken()).toBe('firebase-token');
    });

    it('getIdToken returns null when not authenticated', () => {
      expect(authStoreUtils.getIdToken()).toBeNull();
    });

    it('triggerLogout clears the store', () => {
      useAuthStore.getState().setAuth(makeUser(), 'token');
      authStoreUtils.triggerLogout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
