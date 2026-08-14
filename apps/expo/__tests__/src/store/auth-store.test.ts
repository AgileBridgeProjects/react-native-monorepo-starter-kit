import { authStoreUtils, useAuthStore } from '@store/auth-store';
import { beforeEach, describe, expect, it } from 'vitest';

import { makeUser } from '@/test/factories';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      idToken: null,
      isAuthenticated: false,
      activeClubId: null,
    });
  });

  it('starts unauthenticated', () => {
    expect(useAuthStore.getState().isAuthenticated).toBeFalsy();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setAuth updates user, idToken, and isAuthenticated', () => {
    const user = makeUser();
    useAuthStore.getState().setAuth(user, 'firebase-id-token');

    expect(useAuthStore.getState().user).toBe(user);
    expect(useAuthStore.getState().idToken).toBe('firebase-id-token');
    expect(useAuthStore.getState().isAuthenticated).toBeTruthy();
  });

  it('logout clears state including idToken', () => {
    useAuthStore.getState().setAuth(makeUser(), 'firebase-token');
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().idToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBeFalsy();
  });

  describe('authStoreUtils', () => {
    it('getAccessToken returns Firebase idToken', () => {
      useAuthStore.getState().setAuth(makeUser(), 'firebase-token');
      expect(authStoreUtils.getAccessToken()).toBe('firebase-token');
    });

    it('getIdToken returns the Firebase idToken', () => {
      useAuthStore.getState().setAuth(makeUser(), 'firebase-token');
      expect(authStoreUtils.getIdToken()).toBe('firebase-token');
    });

    it('triggerLogout resets the store', () => {
      useAuthStore.getState().setAuth(makeUser(), 'token');
      authStoreUtils.triggerLogout();
      expect(useAuthStore.getState().isAuthenticated).toBeFalsy();
    });
  });

  describe('multi-org', () => {
    it('setAuth does not seed activeClubId (null means "not yet picked")', () => {
      useAuthStore.getState().setAuth(makeUser({ clubId: 'a' }), 'token');
      expect(useAuthStore.getState().activeClubId).toBeNull();
    });

    it('setActiveOrg updates activeClubId without mutating user.clubId', () => {
      useAuthStore.getState().setAuth(makeUser({ clubId: 'a' }), 'token');
      useAuthStore.getState().setActiveOrg('b');
      expect(useAuthStore.getState().activeClubId).toBe('b');
      expect(useAuthStore.getState().user?.clubId).toBe('a');
    });

    it('logout clears activeClubId', () => {
      useAuthStore.getState().setAuth(makeUser({ clubId: 'a' }), 'token');
      useAuthStore.getState().setActiveOrg('b');
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().activeClubId).toBeNull();
    });

    it('authStoreUtils.getActiveClubId returns null until user picks an org', () => {
      useAuthStore.getState().setAuth(makeUser({ clubId: 'a' }), 'token');
      expect(authStoreUtils.getActiveClubId()).toBeNull();
      useAuthStore.getState().setActiveOrg('b');
      expect(authStoreUtils.getActiveClubId()).toBe('b');
    });
  });
});
