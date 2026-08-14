import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import {
  AUTH_CTA_GRADIENT,
  AUTH_GRADIENT_COLORS,
  AUTH_HERO_GRADIENT,
  AUTH_LOGO,
  AUTH_LOGO_CLASS,
  AuthGradientHero,
} from '@features/auth/presentation/components/auth-gradient-hero';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { byTestId, queryAllByTestId, renderTree, type TestNode } from '@/test/utils/rtr';

vi.mock('@/constants/tokens', () => ({
  palette: { gradient: { start: '#a', mid: '#b', end: '#c' }, cyan: { DEFAULT: '#3bd7f6' } },
}));

const render = (children?: React.ReactNode): TestNode =>
  renderTree(React.createElement(AuthGradientHero, null, children)).root;

describe('AuthGradientHero — snapshots', () => {
  it('matches the default (logo only) tree', () => {
    expect(renderTree(React.createElement(AuthGradientHero)).toJSON()).toMatchSnapshot();
  });

  it('matches the tree with children below the logo', () => {
    expect(
      renderTree(
        React.createElement(AuthGradientHero, null, React.createElement('Text', null, 'hi')),
      ).toJSON(),
    ).toMatchSnapshot();
  });
});

describe('AuthGradientHero', () => {
  it('renders the gradient container with the hero testID', () => {
    expect(byTestId(render(), AUTH_TEST_IDS.components.gradientHero)).toBeTruthy();
  });

  it('renders the branded logo Image with the shared source, class and a11y label', () => {
    const logo = render().findAllByType('Image')[0];
    expect(logo.props.source).toBe(AUTH_LOGO);
    expect(logo.props.className).toBe(AUTH_LOGO_CLASS);
    expect(logo.props.resizeMode).toBe('contain');
    expect(logo.props.accessibilityLabel).toBe('StarterKit logo');
  });

  it('renders no extra children by default', () => {
    expect(queryAllByTestId(render(), 'hero-child')).toHaveLength(0);
  });

  it('renders children passed below the logo', () => {
    const root = render(React.createElement('View', { testID: 'hero-child' }));
    expect(byTestId(root, 'hero-child')).toBeTruthy();
  });
});

describe('auth gradient constants', () => {
  it('derives the three-stop gradient colour list from the palette', () => {
    expect(AUTH_GRADIENT_COLORS).toEqual(['#a', '#b', '#c']);
  });

  it('exposes a diagonal hero gradient (top-right → bottom-left, cyan toward top-left)', () => {
    expect(AUTH_HERO_GRADIENT.start).toEqual({ x: 1, y: 0 });
    expect(AUTH_HERO_GRADIENT.end).toEqual({ x: 0, y: 1 });
    expect(AUTH_HERO_GRADIENT.locations).toEqual([0.12171, 0.64004, 0.98874]);
  });

  it('exposes a horizontal CTA gradient (left → right)', () => {
    expect(AUTH_CTA_GRADIENT.start).toEqual({ x: 0, y: 0 });
    expect(AUTH_CTA_GRADIENT.end).toEqual({ x: 1, y: 0 });
    expect(AUTH_CTA_GRADIENT.locations).toEqual([0, 0.5, 1]);
  });
});
