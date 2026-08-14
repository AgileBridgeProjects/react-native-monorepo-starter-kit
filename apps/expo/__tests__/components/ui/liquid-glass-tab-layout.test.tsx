import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LiquidGlassTabLayout } from '@/components/ui/liquid-glass-tab-layout';
import { renderTree } from '@/test/utils/rtr';

const routerReplace = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  pathname: '/',
  online: true,
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ replace: routerReplace }),
  usePathname: () => state.pathname,
}));

vi.mock('expo-router/unstable-native-tabs', async () => {
  const React = await import('react');
  const Trigger = ({
    children,
    name,
    disabled,
  }: {
    children?: import('react').ReactNode;
    name: string;
    disabled?: boolean;
  }) =>
    React.createElement('View', { testID: `trigger-${name}`, 'data-disabled': disabled }, children);
  Trigger.Icon = () => React.createElement('View', { testID: 'trigger-icon' });
  Trigger.Label = ({ children }: { children?: import('react').ReactNode }) =>
    React.createElement('Text', null, children);
  Trigger.Badge = ({ children }: { children?: import('react').ReactNode }) =>
    React.createElement('Text', { testID: 'trigger-badge' }, children);
  const NativeTabs = ({ children }: { children?: import('react').ReactNode }) =>
    React.createElement('View', { testID: 'native-tabs' }, children);
  NativeTabs.Trigger = Trigger;
  return { NativeTabs };
});

vi.mock('@lib/i18n', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
vi.mock('@/src/lib/hooks/use-is-online', () => ({ useIsOnline: () => state.online }));

beforeEach(() => {
  routerReplace.mockClear();
  state.pathname = '/';
  state.online = true;
});

describe('LiquidGlassTabLayout', () => {
  it('renders a trigger for every nav item', () => {
    const { root } = renderTree(<LiquidGlassTabLayout />);
    expect(root.findAll((n) => n.props.testID === 'native-tabs')).toHaveLength(1);
    expect(root.findAll((n) => n.props.testID === 'trigger-(home)')).toHaveLength(1);
  });

  it('keeps the offline-enabled home tab interactive while offline', () => {
    state.online = false;
    const { root } = renderTree(<LiquidGlassTabLayout />);
    expect(root.findByProps({ testID: 'trigger-(home)' }).props['data-disabled']).toBeFalsy();
  });

  it('does not redirect when offline on an already offline-enabled tab', () => {
    state.online = false;
    state.pathname = '/';
    renderTree(<LiquidGlassTabLayout />);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('matches the default snapshot', () => {
    const { toJSON } = renderTree(<LiquidGlassTabLayout />);
    expect(toJSON()).toMatchSnapshot();
  });
});
