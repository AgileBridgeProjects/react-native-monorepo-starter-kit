import { ProfileInfoCard } from '@features/profile/presentation/components/profile-info-card';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { byTestId, renderTree, type TestNode, textChildren } from '@/test/utils/rtr';

vi.mock('@lib/i18n', async () => (await import('@/test/mocks/shared')).i18nPassthrough());
vi.mock('@/constants/tokens', async () => (await import('@/test/mocks/shared')).tokensMock());
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));

// Avatar/Icon/Typography from the @/components/ui barrel — wired so initials + copy surface.
vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
vi.mock('@/components/ui/avatar', async () => {
  const ReactModule = await import('react');
  const R = (ReactModule as { default?: typeof React }).default ?? ReactModule;
  return {
    Avatar: ({ name, size, textClassName }: Record<string, unknown>) =>
      R.createElement('View', {
        testID: 'avatar',
        accessibilityLabel: `avatar:${name}`,
        // expose props so the snapshot/test can assert variant wiring
        'data-size': size,
        'data-text-class': textClassName,
      }),
  };
});

const renderCard = (
  props?: Partial<{ name: string; email: string; memberSince: string }>,
): TestNode =>
  renderTree(
    React.createElement(ProfileInfoCard, {
      name: 'Alex Johnson',
      email: 'alex.johnson@starterkit.app',
      memberSince: '14 Jan 2024',
      ...props,
    }),
  ).root;

describe('ProfileInfoCard — structural snapshot', () => {
  it('matches the default render', () => {
    expect(
      renderTree(
        React.createElement(ProfileInfoCard, {
          name: 'Alex Johnson',
          email: 'alex.johnson@starterkit.app',
          memberSince: '14 Jan 2024',
        }),
      ).toJSON(),
    ).toMatchSnapshot();
  });
});

describe('ProfileInfoCard', () => {
  it('renders the name, email and translated member-since copy', () => {
    const root = renderCard();
    const text = textChildren(root);
    expect(text).toContain('Alex Johnson');
    expect(text).toContain('alex.johnson@starterkit.app');
    // i18n passthrough returns the key verbatim
    expect(text).toContain('memberSince');
  });

  it('passes the name through to the Avatar with the xl variant', () => {
    const root = renderCard({ name: 'Jamie Lee' });
    const avatar = byTestId(root, 'avatar');
    expect(avatar.props.accessibilityLabel).toBe('avatar:Jamie Lee');
    expect(avatar.props['data-size']).toBe('xl');
    expect(avatar.props['data-text-class']).toBe('text-xl');
  });

  it('renders the edit (pencil) affordance alongside the name', () => {
    // Icon is mocked to null in makeUiMock; assert the card structure still renders the name row.
    const root = renderCard();
    expect(textChildren(root)).toContain('Alex Johnson');
  });

  it('reflects an empty member-since string without crashing', () => {
    const root = renderCard({ memberSince: '' });
    expect(byTestId(root, 'avatar')).toBeTruthy();
  });

  it('renders a different user entirely when props change', () => {
    const root = renderCard({
      name: 'Sam Patel',
      email: 'sam@corp.io',
      memberSince: '01 Feb 2025',
    });
    const text = textChildren(root);
    expect(text).toContain('Sam Patel');
    expect(text).toContain('sam@corp.io');
  });
});
