import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppDrawer } from '@/components/ui/app-drawer';
import { firePress, renderTree, type TestNode } from '@/test/utils/rtr';

const routerPush = vi.hoisted(() => vi.fn());
const routerReplace = vi.hoisted(() => vi.fn());
const logout = vi.hoisted(() => vi.fn(async () => undefined));
const state = vi.hoisted(() => ({
  online: true,
  orgCount: 2,
  profile: {
    displayName: 'Jane Doe',
    email: 'jane@acme.io',
    avatarUrl: null as string | null,
  },
}));

// react-native's InteractionManager is absent from the shared mock — extend it locally
// and run the deferred callback synchronously so navigation is observable in the test.
vi.mock('react-native', async () => {
  const actual = await import('@/test/mocks/react-native');
  return {
    ...actual,
    default: { ...(actual.default ?? {}) },
    InteractionManager: {
      runAfterInteractions: (cb: () => void) => {
        cb();
        // biome-ignore lint/suspicious/noThenProperty: mocking RN InteractionManager's thenable handle
        return { then: () => undefined, done: () => undefined, cancel: () => undefined };
      },
    },
  };
});

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: routerPush, replace: routerReplace }),
}));

vi.mock('@features/auth/presentation/auth.copy', () => ({
  AUTH_TEST_IDS: { drawer: { switchOrg: 'drawer-switch-org' } },
}));
vi.mock('@features/auth/presentation/hooks/use-auth', () => ({
  useLogout: () => ({ mutateAsync: logout }),
}));
vi.mock('@features/auth/presentation/hooks/use-organisations', () => ({
  useOrganisations: () => ({ data: Array.from({ length: state.orgCount }, (_, i) => ({ id: i })) }),
}));
vi.mock('@features/profile/presentation/hooks/use-profile', () => ({
  useProfile: () => ({ data: state.profile }),
  getCachedAvatarUrl: () => null,
}));
vi.mock('@store/auth-store', () => ({
  useAuthStore: () => ({ user: { name: 'Jane Doe', email: 'jane@acme.io' } }),
}));
vi.mock('@lib/i18n', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
vi.mock('@/src/lib/hooks/use-is-online', () => ({ useIsOnline: () => state.online }));

vi.mock('./avatar', async () => {
  const React = await import('react');
  return {
    Avatar: ({ name }: { name: string }) =>
      React.createElement('View', { testID: 'avatar', 'data-name': name }),
  };
});
vi.mock('@/components/ui/avatar', async () => {
  const React = await import('react');
  return {
    Avatar: ({ name }: { name: string }) =>
      React.createElement('View', { testID: 'avatar', 'data-name': name }),
  };
});
vi.mock('./icon', async () => {
  const React = await import('react');
  return {
    Icon: ({ name }: { name: string }) => React.createElement('View', { testID: `icon-${name}` }),
  };
});
vi.mock('@/components/ui/icon', async () => {
  const React = await import('react');
  return {
    Icon: ({ name }: { name: string }) => React.createElement('View', { testID: `icon-${name}` }),
  };
});
vi.mock('./typography', async () => {
  const React = await import('react');
  return {
    Typography: ({ children }: { children?: import('react').ReactNode }) =>
      React.createElement('Text', null, children),
  };
});
vi.mock('@/components/ui/typography', async () => {
  const React = await import('react');
  return {
    Typography: ({ children }: { children?: import('react').ReactNode }) =>
      React.createElement('Text', null, children),
  };
});

const pressableByLabel = (root: TestNode, label: string): TestNode | undefined =>
  root.findAll((n) => n.type === 'Pressable').find((p) => p.props.accessibilityLabel === label);

const texts = (root: TestNode): unknown[] =>
  root.findAll((n) => n.type === 'Text').flatMap((n) => n.props.children);

beforeEach(() => {
  routerPush.mockClear();
  routerReplace.mockClear();
  logout.mockClear();
  state.online = true;
  state.orgCount = 2;
  state.profile = {
    displayName: 'Jane Doe',
    email: 'jane@acme.io',
    avatarUrl: null,
  };
});

describe('AppDrawer', () => {
  it('renders nothing when not visible', () => {
    const { toJSON } = renderTree(<AppDrawer visible={false} onClose={() => {}} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the user name, email and account section when visible', () => {
    const { root } = renderTree(<AppDrawer visible onClose={() => {}} />);
    const t = texts(root);
    expect(t).toContain('Jane Doe');
    expect(t).toContain('jane@acme.io');
    expect(t).toContain('yourAccount');
  });

  it('shows the switch-organisation item only when the user has more than one org', () => {
    const { root } = renderTree(<AppDrawer visible onClose={() => {}} />);
    expect(root.findAll((n) => n.props.testID === 'drawer-switch-org')).toHaveLength(1);
  });

  it('hides the switch-organisation item with a single org', () => {
    state.orgCount = 1;
    const { root } = renderTree(<AppDrawer visible onClose={() => {}} />);
    expect(root.findAll((n) => n.props.testID === 'drawer-switch-org')).toHaveLength(0);
  });

  it('navigates to /profile and closes when Edit profile is pressed', async () => {
    const onClose = vi.fn();
    const { root } = renderTree(<AppDrawer visible onClose={onClose} />);
    const editRow = root
      .findAll((n) => n.type === 'Pressable')
      .find(
        (p) => p.findAll((c) => c.type === 'Text' && c.props.children === 'editProfile').length > 0,
      );
    await firePress(editRow);
    expect(onClose).toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith('/profile');
  });

  it('switches organisation via the switch-org item', async () => {
    const onClose = vi.fn();
    const { root } = renderTree(<AppDrawer visible onClose={onClose} />);
    await firePress(root.findByProps({ testID: 'drawer-switch-org' }));
    expect(onClose).toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith('/select-org');
  });

  it('navigates to /settings from the settings item', async () => {
    const { root } = renderTree(<AppDrawer visible onClose={() => {}} />);
    const settingsRow = root
      .findAll((n) => n.type === 'Pressable')
      .find(
        (p) => p.findAll((c) => c.type === 'Text' && c.props.children === 'settings').length > 0,
      );
    await firePress(settingsRow);
    expect(routerPush).toHaveBeenCalledWith('/settings');
  });

  it('navigates to /help from the support section', async () => {
    const { root } = renderTree(<AppDrawer visible onClose={() => {}} />);
    const helpRow = root
      .findAll((n) => n.type === 'Pressable')
      .find((p) => p.findAll((c) => c.type === 'Text' && c.props.children === 'help').length > 0);
    await firePress(helpRow);
    expect(routerPush).toHaveBeenCalledWith('/help');
  });

  it('logs out and replaces to login when logout is pressed', async () => {
    const { root } = renderTree(<AppDrawer visible onClose={() => {}} />);
    const logoutRow = root
      .findAll((n) => n.type === 'Pressable')
      .find((p) => p.findAll((c) => c.type === 'Text' && c.props.children === 'logout').length > 0);
    await firePress(logoutRow);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(routerReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('disables account items and the logout button while offline', () => {
    state.online = false;
    const { root } = renderTree(<AppDrawer visible onClose={() => {}} />);
    const switchOrg = root.findByProps({ testID: 'drawer-switch-org' });
    expect(switchOrg.props.disabled).toBeTruthy();
    expect(switchOrg.props.accessibilityState).toEqual({ disabled: true });
  });

  it('closes via the close button', async () => {
    const onClose = vi.fn();
    const { root } = renderTree(<AppDrawer visible onClose={onClose} />);
    await firePress(pressableByLabel(root, 'Close menu'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('matches the default snapshot', () => {
    const { toJSON } = renderTree(<AppDrawer visible onClose={() => {}} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
