import type React from 'react';
import { View } from 'react-native';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ActionSheet } from '@/components/ui/action-sheet';
import { queryAllByTestId, renderTree } from '@/test/utils/rtr';

// node environment has no real DOM portal target — render the overlay inline.
vi.mock('react-dom', () => ({
  createPortal: (node: React.ReactNode) => node,
}));

// The web sheet references document.body for the portal target; provide a stub.
const globalWithDoc = globalThis as { document?: unknown };
const hadDocument = 'document' in globalThis;

beforeAll(() => {
  if (!hadDocument) globalWithDoc.document = { body: {} };
});

afterAll(() => {
  if (!hadDocument) delete globalWithDoc.document;
});

describe('ActionSheet (web)', () => {
  it('renders nothing when not visible', () => {
    const renderer = renderTree(
      <ActionSheet visible={false} onClose={vi.fn()}>
        <View testID="sheet-body" />
      </ActionSheet>,
    );

    expect(renderer.toJSON()).toBeNull();
  });

  it('renders the dialog overlay and children when visible', () => {
    const renderer = renderTree(
      <ActionSheet visible onClose={vi.fn()}>
        <View testID="sheet-body" />
      </ActionSheet>,
    );

    const dialog = renderer.root.find(
      (n) => typeof n.type === 'string' && n.props.role === 'dialog',
    );
    expect(dialog.props['aria-modal']).toBe('true');
    expect(queryAllByTestId(renderer.root, 'sheet-body')).toHaveLength(1);
    expect(renderer.toJSON()).toMatchSnapshot();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const renderer = renderTree(
      <ActionSheet visible onClose={onClose}>
        <View testID="sheet-body" />
      </ActionSheet>,
    );
    const backdrop = renderer.root.find(
      (n) => typeof n.type === 'string' && n.props.role === 'dialog',
    );

    backdrop.props.onClick();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    const renderer = renderTree(
      <ActionSheet visible onClose={onClose}>
        <View testID="sheet-body" />
      </ActionSheet>,
    );
    const backdrop = renderer.root.find(
      (n) => typeof n.type === 'string' && n.props.role === 'dialog',
    );

    backdrop.props.onKeyDown({ key: 'Escape' });
    backdrop.props.onKeyDown({ key: 'Enter' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stops propagation on the inner content so clicks do not close the sheet', () => {
    const onClose = vi.fn();
    const stopPropagation = vi.fn();
    const renderer = renderTree(
      <ActionSheet visible onClose={onClose}>
        <View testID="sheet-body" />
      </ActionSheet>,
    );
    const inner = renderer.root.find(
      (n) => typeof n.type === 'string' && n.props.role === 'presentation',
    );

    inner.props.onClick({ stopPropagation });

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
