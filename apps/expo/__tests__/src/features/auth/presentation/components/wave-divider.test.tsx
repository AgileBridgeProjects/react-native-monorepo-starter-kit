import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { WaveDivider } from '@features/auth/presentation/components/wave-divider';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { byTestId, queryAllByTestId, renderTree, type TestNode } from '@/test/utils/rtr';

let scheme: 'light' | 'dark' = 'light';
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => scheme }));
vi.mock('@/constants/tokens', () => ({
  colors: {
    light: { surface: '#ffffff' },
    dark: { surface: '#000000' },
  },
}));

const render = (width = 375): TestNode =>
  renderTree(React.createElement(WaveDivider, { width })).root;

beforeEach(() => {
  scheme = 'light';
});

describe('WaveDivider — snapshots', () => {
  it('matches the default tree', () => {
    expect(renderTree(React.createElement(WaveDivider, { width: 375 })).toJSON()).toMatchSnapshot();
  });
});

describe('WaveDivider', () => {
  it('renders the wrapper, an Svg and a single Path', () => {
    const root = render();
    expect(byTestId(root, AUTH_TEST_IDS.components.waveDivider)).toBeTruthy();
    expect(root.findAllByType('Svg')).toHaveLength(1);
    expect(root.findAllByType('Path')).toHaveLength(1);
  });

  it('sizes the Svg to the provided screen width and the fixed wave height', () => {
    const svg = render(800).findAllByType('Svg')[0];
    expect(svg.props.width).toBe(800);
    expect(svg.props.height).toBe(80);
    expect(svg.props.viewBox).toBe('0 0 800 80');
  });

  it('derives the path geometry from the width (edge-to-edge sweep)', () => {
    const path = render(1000).findAllByType('Path')[0];
    // Path starts at x=0 and closes at the full width.
    expect(path.props.d.startsWith('M0,')).toBeTruthy();
    expect(path.props.d).toContain('1000,80');
  });

  it('fills with the light surface colour by default', () => {
    expect(render().findAllByType('Path')[0].props.fill).toBe('#ffffff');
  });

  it('fills with the dark surface colour in dark mode', () => {
    scheme = 'dark';
    expect(render().findAllByType('Path')[0].props.fill).toBe('#000000');
  });

  it('renders a single divider node for the registered testID', () => {
    expect(queryAllByTestId(render(), AUTH_TEST_IDS.components.waveDivider)).toHaveLength(1);
  });
});
