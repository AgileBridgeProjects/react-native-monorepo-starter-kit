import {
  ORGANISATIONS_QUERY_KEY,
  useOrganisations,
  useOrgSwitch,
} from '@features/auth/presentation/hooks/use-organisations';
import { useAuthStore } from '@store/auth-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { act, create } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeLinkedOrg } from '@/test/factories/auth.factory';

const getLinkedOrganisations = vi.fn();
vi.mock('@features/auth/infrastructure/datasources/organisations.datasource', () => ({
  organisationsDatasource: {
    getLinkedOrganisations: () => getLinkedOrganisations(),
  },
}));

const hapticSelection = vi.fn();
vi.mock('@lib/utils/haptics', () => ({ hapticSelection: () => hapticSelection() }));

/**
 * Renders a hook against a caller-supplied QueryClient so query/cache behaviour
 * (invalidation predicates, cache seeding) can be asserted directly.
 */
function renderWithClient<T>(useHook: () => T, queryClient: QueryClient) {
  let current: T | undefined;
  function Harness(): ReactNode {
    current = useHook();
    return null;
  }
  let renderer: ReturnType<typeof create> | undefined;
  act(() => {
    renderer = create(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(Harness),
      ),
    );
  });
  return {
    get current() {
      if (current === undefined) throw new Error('hook value not ready');
      return current;
    },
    update: () =>
      act(() => {
        renderer?.update(
          React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(Harness),
          ),
        );
      }),
  };
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function resetStore() {
  useAuthStore.setState({
    user: null,
    idToken: null,
    isAuthenticated: false,
    isResolvingOrg: false,
    activeClubId: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
});

describe('ORGANISATIONS_QUERY_KEY', () => {
  it('is the stable ["auth", "organisations"] tuple', () => {
    expect(ORGANISATIONS_QUERY_KEY).toEqual(['auth', 'organisations']);
  });
});

describe('useOrganisations', () => {
  it('fetches linked organisations from the datasource', async () => {
    const orgs = [makeLinkedOrg({ clubId: 'c-1' }), makeLinkedOrg({ clubId: 'c-2' })];
    getLinkedOrganisations.mockResolvedValue(orgs);
    const client = newClient();
    const hook = renderWithClient(() => useOrganisations(), client);

    await act(async () => {
      await client.getQueryCache().find({ queryKey: ORGANISATIONS_QUERY_KEY })?.fetch();
    });
    hook.update();

    expect(getLinkedOrganisations).toHaveBeenCalled();
    expect(hook.current.data).toHaveLength(2);
    expect(hook.current.isSuccess).toBeTruthy();
  });

  it('does not run the query when disabled', () => {
    getLinkedOrganisations.mockResolvedValue([]);
    const hook = renderWithClient(() => useOrganisations(false), newClient());

    expect(getLinkedOrganisations).not.toHaveBeenCalled();
    expect(hook.current.fetchStatus).toBe('idle');
  });

  it('exposes the error state when the fetch fails', async () => {
    getLinkedOrganisations.mockRejectedValue(new Error('boom'));
    const client = newClient();
    const hook = renderWithClient(() => useOrganisations(), client);

    await act(async () => {
      await client
        .getQueryCache()
        .find({ queryKey: ORGANISATIONS_QUERY_KEY })
        ?.fetch()
        .catch(() => {});
    });
    hook.update();

    expect(hook.current.isError).toBeTruthy();
  });
});

describe('useOrgSwitch', () => {
  it('fires haptic feedback and sets the active org', () => {
    const hook = renderWithClient(() => useOrgSwitch(), newClient());

    act(() => {
      hook.current('co-99');
    });

    expect(hapticSelection).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().activeClubId).toBe('co-99');
  });

  it('invalidates every cached query except the organisations list itself', () => {
    const client = newClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const hook = renderWithClient(() => useOrgSwitch(), client);

    act(() => {
      hook.current('co-99');
    });

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    const { predicate } = invalidateSpy.mock.calls[0][0] as {
      predicate: (q: { queryKey: readonly unknown[] }) => boolean;
    };
    // The org list is preserved (predicate false); everything else is invalidated (true).
    expect(predicate({ queryKey: ORGANISATIONS_QUERY_KEY })).toBeFalsy();
    expect(predicate({ queryKey: ['games'] })).toBeTruthy();
    expect(predicate({ queryKey: ['auth', 'something-else'] })).toBeTruthy();
    expect(predicate({ queryKey: ['profile', 'organisations'] })).toBeTruthy();
  });
});
