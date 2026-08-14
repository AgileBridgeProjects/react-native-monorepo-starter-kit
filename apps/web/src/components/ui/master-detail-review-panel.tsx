'use client';

import { uiConfig } from '@lib/ui-config';
import { cn } from '@starterkit/shared';
import type { ReorderEvent } from 'devextreme/ui/sortable';
import Sortable from 'devextreme-react/sortable';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Typography } from './typography';

export interface MasterDetailReviewPanelRenderItemArgs<TItem> {
  item: TItem;
  isSelected: boolean;
}

export interface MasterDetailReviewPanelProps<TItem> {
  items: readonly TItem[];
  getItemId: (item: TItem) => string;
  renderItem: (args: MasterDetailReviewPanelRenderItemArgs<TItem>) => ReactNode;
  title: ReactNode;
  description?: ReactNode;
  count?: ReactNode;
  emptyState?: ReactNode;
  selectedId?: string | null;
  detail?: ReactNode;
  onDetailOpenChange?: (isOpen: boolean) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  skeletons?: ReactNode;
  testId?: string;
  sortableHandle?: string;
  detailRevealDelayMs?: number;
  masterListWidth?: number;
}

export function MasterDetailReviewPanel<TItem>({
  items,
  getItemId,
  renderItem,
  title,
  description,
  count,
  emptyState,
  selectedId = null,
  detail,
  onDetailOpenChange,
  onReorder,
  skeletons,
  testId,
  sortableHandle = '.drag-handle',
  detailRevealDelayMs = uiConfig.drawer.editPaneRevealMs,
  masterListWidth = uiConfig.drawer.masterDetailListWidth,
}: MasterDetailReviewPanelProps<TItem>) {
  const [isPaneRevealed, setIsPaneRevealed] = useState(false);
  const isDetailOpen = selectedId !== null;

  useEffect(() => {
    onDetailOpenChange?.(isDetailOpen);
    return () => onDetailOpenChange?.(false);
  }, [isDetailOpen, onDetailOpenChange]);

  useEffect(() => {
    if (!isDetailOpen) {
      setIsPaneRevealed(false);
      return;
    }

    const id = window.setTimeout(() => setIsPaneRevealed(true), detailRevealDelayMs);
    return () => window.clearTimeout(id);
  }, [detailRevealDelayMs, isDetailOpen]);

  function handleReorder(e: ReorderEvent) {
    if (e.fromIndex === e.toIndex) return;
    onReorder?.(e.fromIndex, e.toIndex);
  }

  const renderedItems = items.map((item) => {
    const itemId = getItemId(item);
    const isSelected = selectedId === itemId;
    return (
      <div key={itemId} className="mb-2 last:mb-0">
        {renderItem({ item, isSelected })}
      </div>
    );
  });

  let listContent: ReactNode = renderedItems;
  if (onReorder) {
    listContent = (
      <Sortable itemOrientation="vertical" handle={sortableHandle} onReorder={handleReorder}>
        {renderedItems}
      </Sortable>
    );
  }

  let listColumnClass = 'min-w-0 flex-1';
  let listColumnStyle: CSSProperties | undefined;
  if (isDetailOpen) {
    listColumnClass = 'shrink-0 border-r border-border';
    listColumnStyle = { width: masterListWidth };
  }
  const detailPaneClass = isPaneRevealed ? 'opacity-100' : 'opacity-0';

  return (
    <div data-testid={testId} className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-md border-b border-border px-lg py-sm">
        <div className="min-w-0">
          <Typography variant="caption" className="block font-semibold uppercase tracking-wider">
            {title}
          </Typography>
          {description && (
            <Typography variant="caption" className="mt-0.5 block text-text-muted">
              {description}
            </Typography>
          )}
        </div>
        {count && (
          <Typography variant="caption" className="shrink-0 whitespace-nowrap">
            {count}
          </Typography>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className={cn('flex min-h-0 flex-col', listColumnClass)} style={listColumnStyle}>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-lg py-md">
            {items.length === 0 && !skeletons && emptyState}
            {listContent}
            {skeletons}
          </div>
        </div>

        {isDetailOpen && (
          <div
            className={cn(
              'min-h-0 min-w-0 flex-1 transition-opacity duration-200',
              detailPaneClass,
            )}
          >
            {isPaneRevealed && detail}
          </div>
        )}
      </div>
    </div>
  );
}
