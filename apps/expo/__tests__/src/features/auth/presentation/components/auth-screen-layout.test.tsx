import { AuthScreenLayout } from '@features/auth/presentation/components/auth-screen-layout';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { byTestId, queryAllByTestId, renderTree, type TestNode } from '@/test/utils/rtr';

// Controllable platform + viewport width.
const platform = { OS: 'ios' as 'ios' | 'android' | 'web' };
let screenWidth = 375;

vi.mock('react-native', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-native');
  return {
    ...actual,
    Platform: {
      ...(actual.Platform as object),
      get OS() {
        return platform.OS;
      },
    },
    useWindowDimensions: () => ({ width: screenWidth, height: 812, scale: 1, fontScale: 1 }),
  };
});
vi.mock('@/components/ui', () => ({
  KeyboardDismissView: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('View', { testID: 'keyboard-dismiss' }, children),
}));
vi.mock('@features/auth/presentation/components/auth-gradient-hero', () => ({
  AUTH_HERO_GRADIENT: {},
  AUTH_LOGO: 1,
  AUTH_LOGO_A11Y_LABEL: 'StarterKit logo',
  AUTH_LOGO_CLASS: 'logo-class',
}));

let reducedMotion = false;
vi.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => reducedMotion }));

const formChild = React.createElement('View', { testID: 'form-child' });
const render = (extra: Partial<Parameters<typeof AuthScreenLayout>[0]> = {}): TestNode =>
  renderTree(<AuthScreenLayout {...extra}>{formChild}</AuthScreenLayout>).root;

beforeEach(() => {
  platform.OS = 'ios';
  screenWidth = 375;
  reducedMotion = false;
});

describe('AuthScreenLayout — snapshots', () => {
  it('matches the native tree', () => {
    expect(renderTree(<AuthScreenLayout>{formChild}</AuthScreenLayout>).toJSON()).toMatchSnapshot();
  });

  it('matches the wide-web split-panel tree', () => {
    platform.OS = 'web';
    screenWidth = 1200;
    expect(renderTree(<AuthScreenLayout>{formChild}</AuthScreenLayout>).toJSON()).toMatchSnapshot();
  });
});

describe('AuthScreenLayout — native', () => {
  it('wraps the hero in a KeyboardDismissView and renders the form card', () => {
    const root = render();
    expect(byTestId(root, 'keyboard-dismiss')).toBeTruthy();
    expect(byTestId(root, 'auth-gradient-hero')).toBeTruthy();
    expect(byTestId(root, 'form-child')).toBeTruthy();
  });

  it('renders the branded logo image', () => {
    expect(render().findAllByType('Image').length).toBeGreaterThan(0);
  });

  it('ignores the webSlotBefore on native', () => {
    const root = render({ webSlotBefore: React.createElement('View', { testID: 'web-slot' }) });
    expect(queryAllByTestId(root, 'web-slot')).toHaveLength(0);
  });
});

describe('AuthScreenLayout — mobile web (<768px)', () => {
  it('uses the native-style hero without the KeyboardDismissView', () => {
    platform.OS = 'web';
    screenWidth = 500;
    const root = render();
    expect(queryAllByTestId(root, 'keyboard-dismiss')).toHaveLength(0);
    expect(byTestId(root, 'auth-gradient-hero')).toBeTruthy();
    expect(byTestId(root, 'form-child')).toBeTruthy();
  });

  it('renders the webSlotBefore content above the hero', () => {
    platform.OS = 'web';
    screenWidth = 500;
    const root = render({ webSlotBefore: React.createElement('View', { testID: 'web-slot' }) });
    expect(byTestId(root, 'web-slot')).toBeTruthy();
  });
});

describe('AuthScreenLayout — form card entrance', () => {
  it('starts translated below the visible area when motion is not reduced', () => {
    const root = render();
    const card = byTestId(root, 'auth-form-card');
    const style = card.props.style as { transform: Array<{ translateY: number }> };
    expect(style.transform[0].translateY).toBeGreaterThan(0);
  });

  it('starts at rest (no offset) when reduced motion is on', () => {
    reducedMotion = true;
    const root = render();
    const card = byTestId(root, 'auth-form-card');
    const style = card.props.style as { transform: Array<{ translateY: number }> };
    expect(style.transform[0].translateY).toBe(0);
  });
});

describe('AuthScreenLayout — keyboard-aware card (hero-image layout)', () => {
  it('renders fixed, non-scrolling content (KeyboardAvoidingView, no ScrollView) when heroImage is set', () => {
    const root = render({ heroImage: 1 });
    expect(root.findAllByType('ScrollView')).toHaveLength(0);
    expect(root.findAllByType('KeyboardAvoidingView').length).toBeGreaterThan(0);
    expect(byTestId(root, 'form-child')).toBeTruthy();
  });

  it('still uses a scrollable ScrollView when heroImage is not set', () => {
    const root = render();
    expect(root.findAllByType('ScrollView').length).toBeGreaterThan(0);
    expect(root.findAllByType('KeyboardAvoidingView')).toHaveLength(0);
  });
});

describe('AuthScreenLayout — wide web (>=768px)', () => {
  it('renders the split-panel layout (no wave divider, with ScrollView form)', () => {
    platform.OS = 'web';
    screenWidth = 1200;
    const root = render();
    expect(queryAllByTestId(root, 'wave-divider')).toHaveLength(0);
    expect(queryAllByTestId(root, 'keyboard-dismiss')).toHaveLength(0);
    expect(byTestId(root, 'form-child')).toBeTruthy();
    expect(root.findAllByType('ScrollView').length).toBeGreaterThan(0);
  });

  it('renders the webSlotBefore content above the split panel', () => {
    platform.OS = 'web';
    screenWidth = 1200;
    const root = render({ webSlotBefore: React.createElement('View', { testID: 'web-slot' }) });
    expect(byTestId(root, 'web-slot')).toBeTruthy();
  });
});
