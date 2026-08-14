import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { SelectOrgHeader } from '@features/auth/presentation/components/select-org-header';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { byTestId, renderTree, type TestNode, textChildren } from '@/test/utils/rtr';

vi.mock('@starterkit/shared', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@starterkit/shared');
  return { ...actual, iconSize: { md: 20 } };
});
vi.mock('@lib/i18n', async () => (await import('@/test/mocks/shared')).i18nPassthrough());
vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
vi.mock('@/components/ui/icon-symbol', () => ({
  IconSymbol: ({ name }: { name?: string }) =>
    React.createElement('View', { testID: `icon-${name}` }),
}));
vi.mock('@/constants/tokens', () => ({
  colors: { light: { primary: '#6d28d9' }, dark: { primary: '#a78bfa' } },
}));

const render = (scheme: 'light' | 'dark' = 'light'): TestNode =>
  renderTree(React.createElement(SelectOrgHeader, { scheme })).root;

describe('SelectOrgHeader — snapshots', () => {
  it('matches the default tree', () => {
    expect(
      renderTree(React.createElement(SelectOrgHeader, { scheme: 'light' })).toJSON(),
    ).toMatchSnapshot();
  });
});

describe('SelectOrgHeader', () => {
  it('renders the header container with the registered testID', () => {
    expect(byTestId(render(), AUTH_TEST_IDS.components.selectOrgHeader)).toBeTruthy();
  });

  it('renders the building icon, title and subtitle copy', () => {
    const root = render();
    expect(byTestId(root, 'icon-building.2.fill')).toBeTruthy();
    const text = textChildren(root);
    expect(text).toContain('selectOrg.title');
    expect(text).toContain('selectOrg.subtitle');
  });
});
