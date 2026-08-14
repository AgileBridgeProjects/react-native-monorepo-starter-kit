import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LogoutButton } from '@/components/ui/logout-button';
import { firePress, hostByTestId, renderTree, textChildren } from '@/test/utils/rtr';

const logoutState = vi.hoisted(() => ({
  mutateAsync: vi.fn(async () => undefined),
  isPending: false,
}));

vi.mock('@features/auth/presentation/hooks/use-auth', () => ({
  useLogout: () => ({ mutateAsync: logoutState.mutateAsync, isPending: logoutState.isPending }),
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

beforeEach(() => {
  logoutState.mutateAsync = vi.fn(async () => undefined);
  logoutState.isPending = false;
});

describe('LogoutButton', () => {
  describe('default (full-width Button) variant', () => {
    it('renders the logout label', () => {
      const { root } = renderTree(<LogoutButton testID="logout" />);
      expect(textChildren(root)).toContain('logoutButton');
    });

    it('logs out then calls onSuccess and onDismiss in order on press', async () => {
      const order: string[] = [];
      logoutState.mutateAsync = vi.fn(async () => {
        order.push('logout');
      });
      const onSuccess = vi.fn(() => order.push('success'));
      const onDismiss = vi.fn(() => order.push('dismiss'));
      const { root } = renderTree(
        <LogoutButton testID="logout" onSuccess={onSuccess} onDismiss={onDismiss} />,
      );

      await firePress(hostByTestId(root, 'logout'));

      expect(logoutState.mutateAsync).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(order).toEqual(['logout', 'success', 'dismiss']);
    });

    it('still calls onDismiss when logout rejects, but skips onSuccess', async () => {
      logoutState.mutateAsync = vi.fn(async () => {
        throw new Error('network');
      });
      const onSuccess = vi.fn();
      const onDismiss = vi.fn();
      const { root } = renderTree(
        <LogoutButton testID="logout" onSuccess={onSuccess} onDismiss={onDismiss} />,
      );

      // handlePress re-throws after the finally block, so swallow it here.
      await firePress(hostByTestId(root, 'logout')).catch(() => undefined);

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('disables the button while the logout mutation is pending', () => {
      logoutState.isPending = true;
      const { root } = renderTree(<LogoutButton testID="logout" />);
      expect(hostByTestId(root, 'logout').props.disabled).toBeTruthy();
    });

    it('matches the default snapshot', () => {
      const { toJSON } = renderTree(<LogoutButton testID="logout" />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('nav variant', () => {
    it('renders an icon + label row inside a bordered container', () => {
      const { root } = renderTree(<LogoutButton variant="nav" testID="logout-nav" />);
      const pressable = hostByTestId(root, 'logout-nav');
      expect(pressable.props.accessibilityRole).toBe('button');
      expect(pressable.props.accessibilityLabel).toBe('logoutButton');
      expect(textChildren(root)).toContain('logoutButton');
    });

    it('uses light-mode border classes by default', () => {
      const { root } = renderTree(<LogoutButton variant="nav" testID="logout-nav" />);
      const container = root.findAll((n) => n.type === 'View')[0];
      expect(container.props.className).toContain('border-border');
    });

    it('uses dark styling when the dark prop is set', () => {
      const { root } = renderTree(<LogoutButton variant="nav" dark testID="logout-nav" />);
      const container = root.findAll((n) => n.type === 'View')[0];
      expect(container.props.className).toContain('border-white/10');
    });

    it('disables the pressable while pending', () => {
      logoutState.isPending = true;
      const { root } = renderTree(<LogoutButton variant="nav" testID="logout-nav" />);
      expect(hostByTestId(root, 'logout-nav').props.disabled).toBeTruthy();
    });

    it('triggers logout on press', async () => {
      const { root } = renderTree(<LogoutButton variant="nav" testID="logout-nav" />);
      await firePress(hostByTestId(root, 'logout-nav'));
      expect(logoutState.mutateAsync).toHaveBeenCalledTimes(1);
    });

    it('matches the nav snapshot', () => {
      const { toJSON } = renderTree(<LogoutButton variant="nav" testID="logout-nav" />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches the dark nav snapshot', () => {
      const { toJSON } = renderTree(<LogoutButton variant="nav" dark testID="logout-nav" />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
