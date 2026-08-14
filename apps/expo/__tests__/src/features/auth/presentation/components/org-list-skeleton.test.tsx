import { OrgListSkeleton } from '@features/auth/presentation/components/org-list-skeleton';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderTree, type TestNode } from '@/test/utils/rtr';

// Render Skeleton as an addressable host element capturing its shape.
vi.mock('@/components/ui', () => ({
  Skeleton: ({ shape }: { shape?: string }) =>
    React.createElement('View', { testID: 'skeleton', 'data-shape': shape ?? 'rect' }),
}));

const render = (): TestNode => renderTree(React.createElement(OrgListSkeleton)).root;

describe('OrgListSkeleton — snapshots', () => {
  it('matches the default tree', () => {
    expect(renderTree(React.createElement(OrgListSkeleton)).toJSON()).toMatchSnapshot();
  });
});

describe('OrgListSkeleton', () => {
  it('renders an avatar, two text lines and three card placeholders (6 total)', () => {
    const skeletons = render().findAll((n) => n.props.testID === 'skeleton');
    expect(skeletons).toHaveLength(6);
  });

  it('uses a circle placeholder for the logo and card placeholders for the rows', () => {
    const shapes = render()
      .findAll((n) => n.props.testID === 'skeleton')
      .map((n) => n.props['data-shape']);
    expect(shapes).toContain('circle');
    expect(shapes.filter((s) => s === 'card')).toHaveLength(3);
  });
});
