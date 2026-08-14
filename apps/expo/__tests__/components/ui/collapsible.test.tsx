import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Collapsible } from '@/components/ui/collapsible';
import { firePress, renderTree, textChildren } from '@/test/utils/rtr';

vi.mock('@/components/ui/icon-symbol', async () => {
  const React = await import('react');
  return {
    IconSymbol: ({ name, style }: { name: string; style?: Record<string, unknown> }) =>
      React.createElement('View', { testID: `icon-${name}`, style }),
  };
});

vi.mock('@/components/ui/typography', async () => {
  const React = await import('react');
  return {
    Typography: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('Text', null, children),
  };
});

vi.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('Collapsible', () => {
  it('renders the title and the chevron toggle', () => {
    const { root } = renderTree(
      <Collapsible title="More details">
        {React.createElement('View', { testID: 'body' })}
      </Collapsible>,
    );
    expect(textChildren(root)).toContain('More details');
    expect(root.findAll((n) => n.props.testID === 'icon-chevron.right')).toHaveLength(1);
  });

  it('hides children while collapsed (the default state)', () => {
    const { root } = renderTree(
      <Collapsible title="Section">
        {React.createElement('Text', { testID: 'collapsible-body' }, 'Hidden content')}
      </Collapsible>,
    );
    expect(root.findAll((n) => n.props.testID === 'collapsible-body')).toHaveLength(0);
  });

  it('reveals children after pressing the toggle, then hides them again', async () => {
    const { root } = renderTree(
      <Collapsible title="Section">
        {React.createElement('Text', { testID: 'collapsible-body' }, 'Now visible')}
      </Collapsible>,
    );
    const toggle = root.findAll((n) => n.type === 'Pressable')[0];

    await firePress(toggle);
    expect(root.findAll((n) => n.props.testID === 'collapsible-body')).toHaveLength(1);

    await firePress(toggle);
    expect(root.findAll((n) => n.props.testID === 'collapsible-body')).toHaveLength(0);
  });

  it('rotates the chevron 90deg when expanded', async () => {
    const { root } = renderTree(
      <Collapsible title="Section">{React.createElement('View', { testID: 'body' })}</Collapsible>,
    );
    const chevronBefore = root.findAll((n) => n.props.testID === 'icon-chevron.right')[0];
    expect(chevronBefore.props.style.transform).toEqual([{ rotate: '0deg' }]);

    await firePress(root.findAll((n) => n.type === 'Pressable')[0]);

    const chevronAfter = root.findAll((n) => n.props.testID === 'icon-chevron.right')[0];
    expect(chevronAfter.props.style.transform).toEqual([{ rotate: '90deg' }]);
  });

  it('merges a custom className onto the outer container', () => {
    const { root } = renderTree(
      <Collapsible title="Section" className="mt-lg">
        {React.createElement('View', { testID: 'body' })}
      </Collapsible>,
    );
    const outer = root.findAll((n) => n.type === 'View')[0];
    expect(outer.props.className).toContain('mt-lg');
    expect(outer.props.className).toContain('mb-md');
  });

  it('matches the collapsed snapshot', () => {
    const { toJSON } = renderTree(
      <Collapsible title="Section">{React.createElement('View', { testID: 'body' })}</Collapsible>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
