import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { OrgCard } from '@features/auth/presentation/components/org-card';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeLinkedOrg } from '@/test/factories/auth.factory';
import {
  byTestId,
  firePress,
  hostByTestId,
  queryAllByTestId,
  renderTree,
  type TestNode,
  textChildren,
} from '@/test/utils/rtr';

// The global expo-image mock exports `Image` as a String object, which React rejects;
// re-mock it as a plain host string element so the logo branch renders.
vi.mock('expo-image', () => ({ Image: 'Image' }));
vi.mock('@starterkit/shared', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@starterkit/shared');
  return { ...actual, iconSize: { xs: 12 } };
});
vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
vi.mock('@/components/ui/icon-symbol', () => ({
  IconSymbol: ({ name }: { name?: string }) =>
    React.createElement('View', { testID: `icon-${name}` }),
}));
vi.mock('@/constants/tokens', () => ({
  colors: { light: { textMuted: '#999' }, dark: { textMuted: '#555' } },
}));

const onPress = vi.fn();
type CardProps = Parameters<typeof OrgCard>[0];
type Org = CardProps['org'];
const asOrg = (over: Parameters<typeof makeLinkedOrg>[0]): Org =>
  ({ clubLogoUrl: null, ...makeLinkedOrg(over) }) as Org;
const render = (org: Org): TestNode =>
  renderTree(
    React.createElement(OrgCard, {
      org,
      onPress,
      scheme: 'light',
      accessibilityLabel: `Open ${org.clubName}`,
    }),
  ).root;

const withLogo = asOrg({
  clubId: 'c1',
  clubName: 'Acme Corp',
  clubLogoUrl: 'https://cdn.example.com/acme.png',
});
const withoutLogo = asOrg({
  clubId: 'c2',
  clubName: 'globex',
  clubLogoUrl: null,
});

beforeEach(() => vi.clearAllMocks());

describe('OrgCard — snapshots', () => {
  it('matches the logo-variant tree', () => {
    expect(
      renderTree(
        React.createElement(OrgCard, {
          org: withLogo,
          onPress,
          scheme: 'light',
          accessibilityLabel: 'Open Acme Corp',
        }),
      ).toJSON(),
    ).toMatchSnapshot();
  });

  it('matches the initial-fallback tree', () => {
    expect(
      renderTree(
        React.createElement(OrgCard, {
          org: withoutLogo,
          onPress,
          scheme: 'light',
          accessibilityLabel: 'Open globex',
        }),
      ).toJSON(),
    ).toMatchSnapshot();
  });
});

describe('OrgCard — common structure', () => {
  it('renders the registered org-item testID, the club name and a chevron', () => {
    const root = render(withLogo);
    expect(byTestId(root, AUTH_TEST_IDS.selectOrg.orgItem('c1'))).toBeTruthy();
    expect(textChildren(root)).toContain('Acme Corp');
    expect(byTestId(root, 'icon-chevron.right')).toBeTruthy();
  });

  it('exposes the button role and the provided accessibility label', () => {
    const host = hostByTestId(render(withLogo), AUTH_TEST_IDS.selectOrg.orgItem('c1'));
    expect(host.props.accessibilityRole).toBe('button');
    expect(host.props.accessibilityLabel).toBe('Open Acme Corp');
  });

  it('fires onPress when tapped', async () => {
    await firePress(byTestId(render(withLogo), AUTH_TEST_IDS.selectOrg.orgItem('c1')));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('OrgCard — logo variant', () => {
  it('renders the remote logo image from the club logo URL', () => {
    const root = render(withLogo);
    const image = root.findAllByType('Image')[0];
    expect(image.props.source).toEqual({ uri: 'https://cdn.example.com/acme.png' });
    expect(image.props.contentFit).toBe('contain');
  });

  it('does not render the initial fallback when a logo is present', () => {
    expect(textChildren(render(withLogo))).not.toContain('A');
  });
});

describe('OrgCard — initial fallback', () => {
  it('renders no image and shows the uppercased first initial', () => {
    const root = render(withoutLogo);
    expect(queryAllByTestId(root, 'org-logo-image')).toHaveLength(0);
    expect(root.findAllByType('Image')).toHaveLength(0);
    expect(textChildren(root)).toContain('G');
  });
});
