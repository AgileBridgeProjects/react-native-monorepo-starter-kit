import { AuthInitializer } from '@features/auth/presentation/components/auth-initializer';
import React from 'react';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeUser } from '@/test/factories/auth.factory';
import { renderTree } from '@/test/utils/rtr';

// ─── Captured subscription handlers ──────────────────────────────────────────
type AuthCallbacks = {
  onAuthenticated: (user: unknown, idToken: string) => void;
  onUnauthenticated: () => void;
  onSettled: () => void;
};
let captured: AuthCallbacks | undefined;
let capturedAuthArg: unknown;
const unsubscribeMock = vi.fn();
const subscribeToAuthMock = vi.fn((auth: unknown, cbs: AuthCallbacks) => {
  capturedAuthArg = auth;
  captured = cbs;
  return unsubscribeMock;
});

// ─── AppState listener capture ───────────────────────────────────────────────
let capturedAppStateHandler: ((state: string) => void) | undefined;
const appStateRemoveMock = vi.fn();
const appStateAddListenerMock = vi.fn((_event: string, handler: (state: string) => void) => {
  capturedAppStateHandler = handler;
  return { remove: appStateRemoveMock };
});

// ─── Store + deps ────────────────────────────────────────────────────────────
const setAuth = vi.fn();
const logout = vi.fn();
const setHydrated = vi.fn();
const setActiveOrg = vi.fn();
const setResolvingOrg = vi.fn();
const setPermissions = vi.fn();
const storeActions = {
  setAuth,
  logout,
  setHydrated,
  setActiveOrg,
  setResolvingOrg,
  setPermissions,
};
let storeUser: unknown = null;

// supabase-js autoRefreshToken is toggled via AppState (the old 55-min manual
// Firebase token-refresh timer is gone).
const startAutoRefresh = vi.fn();
const stopAutoRefresh = vi.fn();

const queryClientClear = vi.fn();
const queryClientObj = { clear: queryClientClear };

let resolveOrgResult: Promise<void> = Promise.resolve();
const resolveOrganisationContextMock = vi.fn((_args: unknown) => resolveOrgResult);
const setUserIdMock = vi.fn((_id: unknown) => {});

vi.mock('@starterkit/shared', () => ({
  subscribeToAuth: (auth: unknown, cbs: AuthCallbacks) => subscribeToAuthMock(auth, cbs),
}));
vi.mock('@features/auth/presentation/hooks/use-finalize-auth-session', () => ({
  resolveOrganisationContext: (args: unknown) => resolveOrganisationContextMock(args),
  beginAuthResolution: () => 1,
  isLatestAuthResolution: () => true,
}));
vi.mock('@lib/crash-reporting', () => ({
  crashReporter: { setUserId: (id: unknown) => setUserIdMock(id) },
}));
vi.mock('@lib/supabase/config', () => ({
  supabase: {
    auth: {
      startAutoRefresh: (...a: unknown[]) => startAutoRefresh(...a),
      stopAutoRefresh: (...a: unknown[]) => stopAutoRefresh(...a),
    },
  },
}));
vi.mock('react-native', async () => {
  const actual = await import('@/test/mocks/react-native');
  return {
    ...actual,
    AppState: {
      addEventListener: (event: string, handler: (state: string) => void) =>
        appStateAddListenerMock(event, handler),
    },
  };
});
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => queryClientObj }));
vi.mock('@store/auth-store', () => {
  const hook = () => storeActions;
  hook.getState = () => ({ user: storeUser });
  return { useAuthStore: hook };
});

const render = () => renderTree(React.createElement(AuthInitializer));
const user = makeUser();

beforeEach(() => {
  vi.clearAllMocks();
  captured = undefined;
  capturedAuthArg = undefined;
  capturedAppStateHandler = undefined;
  storeUser = null;
  resolveOrgResult = Promise.resolve();
});

describe('AuthInitializer', () => {
  it('renders nothing', () => {
    expect(render().toJSON()).toBeNull();
  });

  it('subscribes to Supabase auth on mount, passing the supabase client', () => {
    render();
    expect(subscribeToAuthMock).toHaveBeenCalledTimes(1);
    // The subscription is wired to the supabase client (the mocked module export).
    expect(capturedAuthArg).toBeDefined();
    expect(captured?.onAuthenticated).toBeTypeOf('function');
  });

  it('starts supabase auto-refresh and registers an AppState listener on mount', () => {
    render();
    expect(startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(appStateAddListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('toggles auto-refresh with foreground/background AppState transitions', () => {
    render();
    startAutoRefresh.mockClear();

    act(() => capturedAppStateHandler?.('background'));
    expect(stopAutoRefresh).toHaveBeenCalledTimes(1);

    act(() => capturedAppStateHandler?.('active'));
    expect(startAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes, removes the AppState listener, and stops auto-refresh on unmount', () => {
    const renderer = render();
    act(() => renderer.unmount());
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    expect(appStateRemoveMock).toHaveBeenCalledTimes(1);
    expect(stopAutoRefresh).toHaveBeenCalledTimes(1);
  });
});

describe('AuthInitializer — onAuthenticated', () => {
  it('marks org resolution in-flight and hydrates the auth store', async () => {
    render();
    await act(async () => {
      captured?.onAuthenticated(user, 'id-token');
    });
    expect(setResolvingOrg).toHaveBeenCalledWith(true);
    expect(setAuth).toHaveBeenCalledWith(user, 'id-token');
  });

  it('resolves the organisation context before hydrating', async () => {
    render();
    await act(async () => {
      captured?.onAuthenticated(user, 'id-token');
      await resolveOrgResult;
    });
    expect(resolveOrganisationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user,
        setActiveOrg: expect.any(Function),
        setPermissions: expect.any(Function),
      }),
    );
    // setActiveOrg/setPermissions are wrapped so a stale (superseded) resolution can't
    // clobber a newer one — verify the wrapper still forwards to the real store setter
    // for the current (only, so always-latest) resolution.
    const call = resolveOrganisationContextMock.mock.calls[0][0] as {
      setActiveOrg: (clubId: string) => void;
      setPermissions: (permissions: ReadonlySet<string>) => void;
    };
    call.setActiveOrg('club-1');
    expect(setActiveOrg).toHaveBeenCalledWith('club-1');
    call.setPermissions(new Set(['StarterKit.Example.Permission']));
    expect(setPermissions).toHaveBeenCalledWith(new Set(['StarterKit.Example.Permission']));
    expect(setResolvingOrg).toHaveBeenCalledWith(false);
    expect(setHydrated).toHaveBeenCalledWith(true);
  });
});

describe('AuthInitializer — onUnauthenticated', () => {
  it('clears the query cache, resets crash-reporter user, logs out and hydrates', () => {
    render();
    act(() => {
      captured?.onUnauthenticated();
    });
    expect(queryClientClear).toHaveBeenCalledTimes(1);
    expect(setUserIdMock).toHaveBeenCalledWith(null);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(setHydrated).toHaveBeenCalledWith(true);
  });
});
