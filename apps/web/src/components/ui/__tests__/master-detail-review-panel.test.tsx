import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MasterDetailReviewPanel } from '../master-detail-review-panel';

vi.mock('devextreme-react/sortable', () => ({
  default: ({
    children,
    onReorder,
  }: {
    children: React.ReactNode;
    onReorder?: (event: { fromIndex: number; toIndex: number }) => void;
  }) => (
    <div>
      {children}
      <button type="button" onClick={() => onReorder?.({ fromIndex: 0, toIndex: 1 })}>
        Reorder
      </button>
    </div>
  ),
}));

interface Item {
  id: string;
  title: string;
}

const items: Item[] = [
  { id: 'one', title: 'First item' },
  { id: 'two', title: 'Second item' },
];

describe('MasterDetailReviewPanel', () => {
  it('renders header, count, items, and detail content after reveal', async () => {
    render(
      <MasterDetailReviewPanel
        items={items}
        getItemId={(item) => item.id}
        title="Questions"
        description="Review generated questions."
        count={<span>2 items</span>}
        selectedId="two"
        detail={<div data-testid="detail-panel">Question form</div>}
        detailRevealDelayMs={0}
        renderItem={({ item, isSelected }) => (
          <span>
            {item.title}
            {isSelected && ' selected'}
          </span>
        )}
      />,
    );

    expect(screen.getByText('Questions')).toBeTruthy();
    expect(screen.getByText('Review generated questions.')).toBeTruthy();
    expect(screen.getByText('2 items')).toBeTruthy();
    expect(screen.getByText('First item')).toBeTruthy();
    expect(screen.getByText('Second item selected')).toBeTruthy();
    expect(await screen.findByTestId('detail-panel')).toBeTruthy();
  });

  it('renders empty state and notifies detail open changes', () => {
    const onDetailOpenChange = vi.fn();
    const { unmount } = render(
      <MasterDetailReviewPanel
        items={[]}
        getItemId={(item: Item) => item.id}
        title="Questions"
        emptyState={<span>No questions</span>}
        selectedId={null}
        onDetailOpenChange={onDetailOpenChange}
        renderItem={({ item }) => <span>{item.title}</span>}
      />,
    );

    expect(screen.getByText('No questions')).toBeTruthy();
    expect(onDetailOpenChange).toHaveBeenLastCalledWith(false);

    unmount();
    expect(onDetailOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('delegates reorder events when a reorder handler is provided', () => {
    const onReorder = vi.fn();

    render(
      <MasterDetailReviewPanel
        items={items}
        getItemId={(item) => item.id}
        title="Questions"
        onReorder={onReorder}
        renderItem={({ item }) => <span>{item.title}</span>}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));

    expect(onReorder).toHaveBeenCalledWith(0, 1);
  });
});
