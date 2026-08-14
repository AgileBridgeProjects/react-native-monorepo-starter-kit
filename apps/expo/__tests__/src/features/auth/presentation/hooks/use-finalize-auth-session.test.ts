import {
  beginAuthResolution,
  resolveOrganisationContext,
  useFinalizeAuthSession,
} from '@features/auth/presentation/hooks/use-finalize-auth-session';
import { ORGANISATIONS_QUERY_KEY } from '@features/auth/presentation/hooks/use-organisations';
import { useAuthStore } from '@store/auth-store';
import { QueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@starterkit/shared';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook } from '@/test/utils/render-hook';

const getLinkedOrganisations = vi.fn();
const getApiAuthMe = vi.fn();

vi.mock('@features/auth/infrastructure/datasources/supabase-auth.datasource', () => ({
  SupabaseAuthDatasource: class {
    logout = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('@features/auth/infrastructure/datasources/organisations.datasource', () => ({
  organisationsDatasource: {
    getLinkedOrganisations: () => getLinkedOrganisations(),
  },
}));

vi.mock('@features/auth/infrastructure/datasources/me.datasource', () => ({
  meDatasource: {
    getMe: () => getApiAuthMe(),
  },
}));

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return { id: 'uid-1', email: 'user@example.com', name: 'Test User', ...overrides };
}

function makeOrg(clubId: string) {
  return { clubId, clubName: `Club ${clubId}`, clubLogoUrl: null };
}

describe('resolveOrganisationContext', () => {
  beforeEach(() => {
    getLinkedOrganisations.mockReset();
    getApiAuthMe.mockReset();
    getApiAuthMe.mockResolvedValue({ clubId: 'co-1', permissions: [] });
  });

  it('auto-selects the org when the user belongs to exactly one', async () => {
    getLinkedOrganisations.mockResolvedValue([makeOrg('c-1')]);
    const queryClient = new QueryClient();
    const setActiveOrg = vi.fn();
    const setPermissions = vi.fn();

    await resolveOrganisationContext({
      user: makeUser(),
      queryClient,
      setActiveOrg,
      setPermissions,
    });

    expect(setActiveOrg).toHaveBeenCalledWith('c-1');
    expect(queryClient.getQueryData(ORGANISATIONS_QUERY_KEY)).toHaveLength(1);
  });

  it('does not auto-select when the user belongs to multiple orgs', async () => {
    getLinkedOrganisations.mockResolvedValue([makeOrg('c-1'), makeOrg('c-2')]);
    const setActiveOrg = vi.fn();

    await resolveOrganisationContext({
      user: makeUser(),
      queryClient: new QueryClient(),
      setActiveOrg,
      setPermissions: vi.fn(),
    });

    expect(setActiveOrg).not.toHaveBeenCalled();
  });

  it('falls back to the token club claim when the org fetch fails', async () => {
    getLinkedOrganisations.mockRejectedValue(new Error('network'));
    const setActiveOrg = vi.fn();

    await resolveOrganisationContext({
      user: makeUser({ clubId: 'claim-co' }),
      queryClient: new QueryClient(),
      setActiveOrg,
      setPermissions: vi.fn(),
    });

    expect(setActiveOrg).toHaveBeenCalledWith('claim-co');
  });

  it('does not set an org when the fetch fails and there is no club claim', async () => {
    getLinkedOrganisations.mockRejectedValue(new Error('network'));
    const setActiveOrg = vi.fn();

    await resolveOrganisationContext({
      user: makeUser(),
      queryClient: new QueryClient(),
      setActiveOrg,
      setPermissions: vi.fn(),
    });

    expect(setActiveOrg).not.toHaveBeenCalled();
  });

  it('resolves the caller permissions from /api/auth/me', async () => {
    getLinkedOrganisations.mockResolvedValue([makeOrg('c-1')]);
    getApiAuthMe.mockResolvedValue({ clubId: 'co-1', permissions: ['StarterKit.CheckIns.Access'] });
    const setPermissions = vi.fn();

    await resolveOrganisationContext({
      user: makeUser(),
      queryClient: new QueryClient(),
      setActiveOrg: vi.fn(),
      setPermissions,
    });

    expect(setPermissions).toHaveBeenCalledWith(new Set(['StarterKit.CheckIns.Access']));
  });

  it('falls back to an empty permission set when the /me fetch fails', async () => {
    getLinkedOrganisations.mockResolvedValue([makeOrg('c-1')]);
    getApiAuthMe.mockRejectedValue(new Error('network'));
    const setPermissions = vi.fn();

    await resolveOrganisationContext({
      user: makeUser(),
      queryClient: new QueryClient(),
      setActiveOrg: vi.fn(),
      setPermissions,
    });

    expect(setPermissions).toHaveBeenCalledWith(new Set());
  });
});

describe('useFinalizeAuthSession', () => {
  beforeEach(() => {
    getLinkedOrganisations.mockReset();
    getApiAuthMe.mockReset();
    getApiAuthMe.mockResolvedValue({ clubId: 'co-1', permissions: ['StarterKit.CheckIns.Access'] });
    useAuthStore.setState({
      user: null,
      idToken: null,
      isAuthenticated: false,
      isResolvingOrg: false,
      activeClubId: null,
      permissions: new Set(),
    });
  });

  it('authenticates, resolves the org, and clears the resolving flag', async () => {
    getLinkedOrganisations.mockResolvedValue([makeOrg('c-1')]);
    const { result } = renderHook(() => useFinalizeAuthSession());

    await act(async () => {
      await result.current(makeUser(), 'id-token');
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBeTruthy();
    expect(state.idToken).toBe('id-token');
    expect(state.activeClubId).toBe('c-1');
    expect(state.isResolvingOrg).toBeFalsy();
    expect(state.permissions.has('StarterKit.CheckIns.Access')).toBe(true);
  });

  it('clears the resolving flag even when org resolution fails', async () => {
    getLinkedOrganisations.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useFinalizeAuthSession());

    await act(async () => {
      await result.current(makeUser({ clubId: 'claim-co' }), 'id-token');
    });

    expect(useAuthStore.getState().isResolvingOrg).toBeFalsy();
    expect(useAuthStore.getState().activeClubId).toBe('claim-co');
  });

  it('drops a stale resolution write when a newer resolution has since started', async () => {
    let resolveOrgs: (orgs: ReturnType<typeof makeOrg>[]) => void = () => {};
    getLinkedOrganisations.mockReturnValue(
      new Promise((resolve) => {
        resolveOrgs = resolve;
      }),
    );
    const { result } = renderHook(() => useFinalizeAuthSession());

    const pending = result.current(makeUser(), 'id-token');

    // A newer resolution starts (e.g. AuthInitializer's listener firing for the same
    // sign-in event) before this one's org fetch settles.
    beginAuthResolution();

    resolveOrgs([makeOrg('c-1')]);
    await act(async () => {
      await pending;
    });

    // The stale run's org/permissions writes must be dropped — a newer resolution owns them.
    expect(useAuthStore.getState().activeClubId).toBeNull();
    expect(useAuthStore.getState().permissions.has('StarterKit.CheckIns.Access')).toBe(false);
  });
});
