import {
  requireAuth,
  requireClub,
  requirePermission,
  requirePublic,
} from '@features/auth/presentation/guards/route-guards';
import { describe, expect, it } from 'vitest';

import { makeUser } from '@/test/factories';

const emptyPermissions = new Set<string>();

describe('requireAuth', () => {
  it('returns true when the user is authenticated', () => {
    expect(requireAuth({ isAuthenticated: true, user: null, permissions: emptyPermissions })).toBe(
      true,
    );
  });

  it('returns "/login" when the user is not authenticated', () => {
    expect(requireAuth({ isAuthenticated: false, user: null, permissions: emptyPermissions })).toBe(
      '/login',
    );
  });
});

describe('requirePublic', () => {
  it('returns true when the user is not authenticated', () => {
    expect(
      requirePublic({ isAuthenticated: false, user: null, permissions: emptyPermissions }),
    ).toBe(true);
  });

  it('returns "/" when the user is already authenticated', () => {
    expect(
      requirePublic({ isAuthenticated: true, user: null, permissions: emptyPermissions }),
    ).toBe('/');
  });
});

describe('requireClub', () => {
  it('returns true when the user has a clubId', () => {
    const user = makeUser({ clubId: 'club-1' });
    expect(requireClub({ isAuthenticated: true, user, permissions: emptyPermissions })).toBe(true);
  });

  it('returns "/no-club" when user has no clubId', () => {
    const user = makeUser({ clubId: undefined });
    expect(requireClub({ isAuthenticated: true, user, permissions: emptyPermissions })).toBe(
      '/no-club',
    );
  });

  it('returns "/no-club" when user is null', () => {
    expect(requireClub({ isAuthenticated: true, user: null, permissions: emptyPermissions })).toBe(
      '/no-club',
    );
  });

  it('returns "/no-club" when clubId is null', () => {
    const user = makeUser({ clubId: null as never });
    expect(requireClub({ isAuthenticated: true, user, permissions: emptyPermissions })).toBe(
      '/no-club',
    );
  });
});

describe('requirePermission', () => {
  it('returns true when permission exists', () => {
    const guard = requirePermission('StarterKit.Clubs.View', '/topics');
    expect(
      guard({ isAuthenticated: true, user: null, permissions: new Set(['StarterKit.Clubs.View']) }),
    ).toBe(true);
  });

  it('returns redirect when permission is missing', () => {
    const guard = requirePermission('StarterKit.Clubs.View', '/topics');
    expect(guard({ isAuthenticated: true, user: null, permissions: emptyPermissions })).toBe(
      '/topics',
    );
  });
});
