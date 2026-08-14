import { Platform } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AndroidHomeTabScreen, AndroidTabScreen } from '@/components/ui/android-tab-screen';
import { renderTree, type TestNode } from '@/test/utils/rtr';

vi.mock('expo-router', async () => {
  const React = await import('react');
  // Permissive host-element factory: lets us tag mock nodes with arbitrary data-* props.
  const h = React.createElement as (
    t: unknown,
    p?: Record<string, unknown> | null,
    ...c: unknown[]
  ) => ReturnType<typeof React.createElement>;
  const Stack = ({ children, screenOptions }: { children?: unknown; screenOptions?: unknown }) =>
    h('View', { testID: 'stack', 'data-options': screenOptions }, children);
  Stack.Screen = ({ name }: { name: string }) =>
    h('View', { testID: 'stack-screen', 'data-name': name });
  return {
    Slot: () => h('View', { testID: 'slot' }),
    Stack,
  };
});

vi.mock('@features/profile/presentation/hooks/use-profile', () => ({
  useProfile: () => ({ data: { displayName: 'Jane Doe' } }),
}));
vi.mock('@store/auth-store', () => ({
  useAuthStore: (selector: (s: { user: { name: string } }) => unknown) =>
    selector({ user: { name: 'Jane Doe' } }),
}));
vi.mock('@lib/i18n', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
vi.mock('@/src/lib/hooks/use-breakpoints', () => ({
  useBreakpoints: () => ({ isDesktop: false }),
}));

vi.mock('@/components/ui/tab-header', async () => {
  const React = await import('react');
  return {
    TabHeader: ({ title }: { title: string }) =>
      React.createElement('View', { testID: 'tab-header', 'data-title': title }),
  };
});

function setOS(os: 'ios' | 'android') {
  (Platform as { OS: string }).OS = os;
}

const headerTitle = (root: TestNode): unknown =>
  (
    root.findByProps({ testID: 'stack' }).props['data-options'] as { headerTitle: () => unknown }
  ).headerTitle();

afterEach(() => setOS('ios'));

beforeEach(() => setOS('ios'));

describe('AndroidTabScreen', () => {
  it('renders a Slot on non-Android platforms', () => {
    setOS('ios');
    const { root } = renderTree(<AndroidTabScreen title="Games" />);
    expect(root.findAll((n) => n.props.testID === 'slot')).toHaveLength(1);
    expect(root.findAll((n) => n.props.testID === 'stack')).toHaveLength(0);
  });

  it('renders a Stack with a screen on Android', () => {
    setOS('android');
    const { root } = renderTree(<AndroidTabScreen title="Games" />);
    expect(root.findAll((n) => n.props.testID === 'stack')).toHaveLength(1);
    expect(root.findByProps({ testID: 'stack-screen' }).props['data-name']).toBe('index');
  });

  it('renders the TabHeader with the title on Android', () => {
    setOS('android');
    const { root } = renderTree(<AndroidTabScreen title="Games" />);
    const header = renderTree(headerTitle(root) as never);
    expect(header.root.findByProps({ testID: 'tab-header' }).props['data-title']).toBe('Games');
  });

  it('matches the Android snapshot', () => {
    setOS('android');
    const { toJSON } = renderTree(<AndroidTabScreen title="Games" variant="primary" />);
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('AndroidHomeTabScreen', () => {
  it('renders a Slot on non-Android platforms', () => {
    setOS('ios');
    const { root } = renderTree(<AndroidHomeTabScreen />);
    expect(root.findAll((n) => n.props.testID === 'slot')).toHaveLength(1);
  });

  it('renders a Stack with a personalised greeting header on Android', () => {
    setOS('android');
    const { root } = renderTree(<AndroidHomeTabScreen />);
    expect(root.findAll((n) => n.props.testID === 'stack')).toHaveLength(1);
    const header = renderTree(headerTitle(root) as never);
    // first name of the profile display name feeds the greeting translation key
    expect(header.root.findByProps({ testID: 'tab-header' }).props['data-title']).toBe(
      'home:greetingName',
    );
  });

  it('matches the Android home snapshot', () => {
    setOS('android');
    const { toJSON } = renderTree(<AndroidHomeTabScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
