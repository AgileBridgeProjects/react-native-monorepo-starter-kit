import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { OAuthLoadingOverlay } from '@features/auth/presentation/components/oauth-loading-overlay';
import React from 'react';
import { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  byTestId,
  firePress,
  queryAllByTestId,
  renderTree,
  type TestNode,
  type TestRenderer,
  textChildren,
} from '@/test/utils/rtr';

// The shared react-native mock omits ActivityIndicator.
vi.mock('react-native', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-native');
  return { ...actual, ActivityIndicator: 'ActivityIndicator' };
});
vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
vi.mock('@/src/lib/i18n', async () => (await import('@/test/mocks/shared')).i18nPassthrough());
vi.mock('@/constants/tokens', () => ({
  palette: { gradient: { start: '#a', mid: '#b', end: '#c' } },
}));
vi.mock('@features/auth/presentation/components/auth-gradient-hero', () => ({
  AUTH_HERO_GRADIENT: {},
  AUTH_LOGO: 1,
}));
vi.mock('@features/auth/presentation/components/wave-divider', () => ({
  WaveDivider: () => React.createElement('View', { testID: 'wave-divider' }),
}));

const onCancel = vi.fn();
type Props = Partial<Parameters<typeof OAuthLoadingOverlay>[0]>;
const renderer = (props: Props = {}): TestRenderer =>
  renderTree(
    React.createElement(OAuthLoadingOverlay, {
      visible: true,
      provider: 'Google',
      onCancel,
      ...props,
    }),
  );
const render = (props: Props = {}): TestNode => renderer(props).root;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});
afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
});

describe('OAuthLoadingOverlay — snapshots', () => {
  it('matches the visible tree', () => {
    expect(renderer().toJSON()).toMatchSnapshot();
  });

  it('matches the hidden tree (renders nothing)', () => {
    expect(renderer({ visible: false }).toJSON()).toBeNull();
  });
});

describe('OAuthLoadingOverlay — visibility', () => {
  it('renders the overlay, spinner and provider message when visible', () => {
    const root = render();
    expect(byTestId(root, AUTH_TEST_IDS.components.oauthOverlay.root)).toBeTruthy();
    expect(root.findAllByType('ActivityIndicator')).toHaveLength(1);
    expect(textChildren(root)).toContain('oauth.signingInWith');
  });

  it('renders nothing while hidden (Modal not visible)', () => {
    expect(
      queryAllByTestId(render({ visible: false }), AUTH_TEST_IDS.components.oauthOverlay.root),
    ).toHaveLength(0);
  });
});

describe('OAuthLoadingOverlay — cancel', () => {
  it('calls onCancel when the cancel button is pressed', async () => {
    await firePress(byTestId(render(), AUTH_TEST_IDS.components.oauthOverlay.cancelButton));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('OAuthLoadingOverlay — slow threshold', () => {
  it('hides the "taking too long" hint before 20 seconds', () => {
    expect(
      queryAllByTestId(render(), AUTH_TEST_IDS.components.oauthOverlay.slowMessage),
    ).toHaveLength(0);
  });

  it('shows the "taking too long" hint after 20 seconds', () => {
    const root = render();
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(byTestId(root, AUTH_TEST_IDS.components.oauthOverlay.slowMessage)).toBeTruthy();
    expect(textChildren(root)).toContain('oauth.takingLong');
  });

  it('does not start the slow timer while hidden', () => {
    const root = render({ visible: false });
    act(() => {
      vi.advanceTimersByTime(25_000);
    });
    expect(queryAllByTestId(root, AUTH_TEST_IDS.components.oauthOverlay.slowMessage)).toHaveLength(
      0,
    );
  });
});
