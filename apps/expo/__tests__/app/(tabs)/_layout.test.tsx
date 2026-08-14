import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from '@/app/(tabs)/_layout';

// ─── expo-router ─────────────────────────────────────────────────────────────
const routerReplace = vi.fn();
vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => `Redirect:${href}`,
  Slot: () => 'Slot',
  useRouter: () => ({ replace: routerReplace }),
}));

// ─── Store + hooks used by AppLayout ─────────────────────────────────────────
let authState: {
  isAuthenticated: boolean;
  user: { clubId?: string } | null;
  idToken: string | null;
  activeClubId: string | null;
} = {
  isAuthenticated: true,
  user: { clubId: 'club-1' },
  idToken: 'token',
  activeClubId: 'club-1',
};
const setAuth = vi.fn();
const setActiveOrgFromStore = vi.fn();
vi.mock('@store/auth-store', () => ({
  useAuthStore: (selector?: (s: unknown) => unknown) => {
    const state = { ...authState, setAuth, setActiveOrg: setActiveOrgFromStore };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@features/auth/presentation/hooks/use-auth', () => ({
  useLogout: () => ({ mutate: vi.fn() }),
}));

let orgsResult: { data: { clubId: string }[] | undefined; isSuccess: boolean; isError: boolean } = {
  data: [{ clubId: 'club-1' }],
  isSuccess: true,
  isError: false,
};
const orgSwitchMock = vi.fn();
vi.mock('@features/auth/presentation/hooks/use-organisations', () => ({
  useOrganisations: () => orgsResult,
  useOrgSwitch: () => orgSwitchMock,
}));

vi.mock('@/src/proxy/services/auth/auth', () => ({
  getApiAuthMe: vi.fn(() => Promise.resolve({ clubId: 'club-1' })),
}));

vi.mock('@/components/ui', () => ({
  Skeleton: () => 'Skeleton',
  GradientBackground: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/components/ui/liquid-glass-tab-layout', () => ({
  LiquidGlassTabLayout: () => 'LiquidGlassTabLayout',
}));

function renderLayout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let renderer: ReturnType<typeof create> | undefined;
  act(() => {
    renderer = create(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(AppLayout),
      ),
    );
  });
  return renderer as ReturnType<typeof create>;
}

beforeEach(() => {
  vi.clearAllMocks();
  authState = {
    isAuthenticated: true,
    user: { clubId: 'club-1' },
    idToken: 'token',
    activeClubId: 'club-1',
  };
  orgsResult = { data: [{ clubId: 'club-1' }], isSuccess: true, isError: false };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppLayout', () => {
  it('renders the tab layout for a fully-resolved authenticated user', () => {
    const renderer = renderLayout();

    expect(JSON.stringify(renderer.toJSON())).toContain('LiquidGlassTabLayout');
  });

  it('shows the skeleton while the org list is still resolving', () => {
    authState = { ...authState, activeClubId: null };
    orgsResult = { data: undefined, isSuccess: false, isError: false };

    const renderer = renderLayout();

    expect(JSON.stringify(renderer.toJSON())).toContain('Skeleton');
    expect(JSON.stringify(renderer.toJSON())).not.toContain('LiquidGlassTabLayout');
  });

  it('auto-selects the org for single-org users without showing the picker', () => {
    authState = { ...authState, activeClubId: null };

    renderLayout();

    expect(orgSwitchMock).toHaveBeenCalledWith('club-1');
    expect(routerReplace).not.toHaveBeenCalledWith('/select-org');
  });

  it('routes multi-org users to the org picker', () => {
    authState = { ...authState, activeClubId: null };
    orgsResult = {
      data: [{ clubId: 'club-1' }, { clubId: 'club-2' }],
      isSuccess: true,
      isError: false,
    };

    renderLayout();

    expect(routerReplace).toHaveBeenCalledWith('/select-org');
  });

  it('falls back to the token clubId when the org list fails to load', () => {
    authState = { ...authState, activeClubId: null };
    orgsResult = { data: undefined, isSuccess: false, isError: true };

    renderLayout();

    expect(setActiveOrgFromStore).toHaveBeenCalledWith('club-1');
  });
});
