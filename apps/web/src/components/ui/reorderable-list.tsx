'use client';

import { cn } from '@starterkit/shared';
import type { ReorderEvent } from 'devextreme/ui/sortable';
import Sortable from 'devextreme-react/sortable';
import { Fragment, type ReactNode } from 'react';
import { DragHandle } from './drag-handle';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ReorderableListItem {
  id: string;
  title: string;
}

export interface ReorderableListProps<T extends ReorderableListItem> {
  items: T[];
  /** Section label shown in the header (displayed uppercase). */
  label: string;
  /** Suffix after the item count, e.g. "in this topic" or "categories". */
  countSuffix: string;
  /** Called with the from/to indices whenever a drag completes. */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** Optional action buttons rendered at the right of each row (edit, delete, etc.). */
  renderActions?: (item: T) => ReactNode;
  /** Optional full row renderer for rows that need expanded content or custom layout. */
  renderItem?: (item: T) => ReactNode;
  /** Set false to drop the outer rounded/bordered shell — e.g. when the list already sits
   *  inside a bordered section and a second nested border would be redundant. Defaults to true. */
  bordered?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Bordered sortable list with a label/count header and drag-handle rows.
 * Extracted from ManageSubTopicsDrawer — use wherever items need drag-and-drop reordering.
 *
 * The form or additional content for a specific item lives *outside* this component,
 * below it in the parent layout.
 */
export function ReorderableList<T extends ReorderableListItem>({
  items,
  label,
  countSuffix,
  onReorder,
  renderActions,
  renderItem,
  bordered = true,
}: ReorderableListProps<T>) {
  if (items.length === 0) return null;

  function handleReorder(e: ReorderEvent) {
    const { fromIndex, toIndex } = e;
    if (fromIndex !== toIndex) onReorder(fromIndex, toIndex);
  }

  function renderRow(item: T) {
    if (renderItem) {
      return <Fragment key={item.id}>{renderItem(item)}</Fragment>;
    }
    return (
      <div
        key={item.id}
        className="mb-2 flex items-center gap-2 rounded-md border border-border bg-surface px-md py-sm last:mb-0"
      >
        <DragHandle />
        <Typography variant="body-sm" className="flex-1 truncate">
          {item.title}
        </Typography>
        {renderActions && <div className="flex items-center gap-1">{renderActions(item)}</div>}
      </div>
    );
  }

  return (
    <div className={cn(bordered && 'overflow-hidden rounded-lg border border-border')}>
      {/* Header */}
      <div className="flex items-center justify-between px-md pt-md pb-sm">
        <Typography variant="caption" className="font-semibold uppercase tracking-wider">
          {label}
        </Typography>
        <Typography variant="caption">
          <span className="font-semibold text-primary">{items.length}</span> {countSuffix}
        </Typography>
      </div>

      {/* Sortable rows */}
      <div className="px-sm pb-sm">
        <Sortable itemOrientation="vertical" handle=".drag-handle" onReorder={handleReorder}>
          {items.map(renderRow)}
        </Sortable>
      </div>
    </div>
  );
}
