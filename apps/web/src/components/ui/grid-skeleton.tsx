'use client';

import { uiConfig } from '@lib/ui-config';
import { cn } from '@starterkit/shared';
import { Skeleton } from './skeleton';

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_ROW_COUNT = 10;
const PAGER_BUTTON_COUNT = 4;
/** Cycle through these widths per cell to give skeleton rows organic variety. */
const CELL_WIDTHS = ['w-4/5', 'w-3/5', 'w-2/3'] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface GridSkeletonProps {
  /** Number of data columns, excluding the actions column. */
  columnCount: number;
  /** Number of action icons shown per row. Defaults to 0 (no actions column). */
  actionCount?: number;
  /** Whether the Add button should appear in the toolbar area. */
  showAddButton?: boolean;
  /** Whether to render the toolbar row (search + add button). Defaults to true. */
  showToolbar?: boolean;
  /** Whether to render the pager row. Defaults to true. */
  showPager?: boolean;
  /** Number of skeleton rows to render. Defaults to 10. */
  rowCount?: number;
  /** Render a small thumbnail placeholder at the start of the first column (e.g. grids with cover images). */
  showLeadingVisual?: boolean;
  /** Additional class names for the root container. */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A full-grid loading overlay that mirrors the DataGrid layout.
 *
 * Sits `absolute inset-0` so it covers the real grid surface and blocks all
 * pointer interaction while data is fetching. Uses `<Skeleton>` (the shared
 * primitive) for every placeholder bar — all dimensions use Tailwind classes.
 *
 * Designed for `<EntityDataGrid>`, but all sections (toolbar, pager) are
 * individually toggleable for standalone use.
 */
export function GridSkeleton({
  columnCount,
  actionCount = 0,
  showAddButton = false,
  showToolbar = true,
  showPager = true,
  rowCount = DEFAULT_ROW_COUNT,
  showLeadingVisual = false,
  className,
}: GridSkeletonProps) {
  const showActions = actionCount > 0;

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex w-full flex-col overflow-hidden rounded-lg bg-surface-elevated',
        className,
      )}
    >
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      {showToolbar && (
        <div className="flex items-center justify-between border-b border-border px-3 py-sm">
          <div className="flex items-center gap-xs">
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-9 w-9" />
          </div>
          {showAddButton && <Skeleton className="h-9 w-32" />}
        </div>
      )}

      {/* ── Column headers ───────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-border px-md py-sm">
        {Array.from({ length: columnCount }, (_, colIdx) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
            key={colIdx}
            className="flex-1 px-xs"
          >
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}

        {showActions && (
          <div
            className="flex shrink-0 justify-center"
            style={{ width: uiConfig.grid.actionsColumnWidth }}
          >
            <Skeleton className="h-3 w-16" />
          </div>
        )}
      </div>

      {/* ── Data rows ────────────────────────────────────────────────────── */}
      {Array.from({ length: rowCount }, (_, rowIdx) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
          key={rowIdx}
          className={cn(
            'flex items-center border-b border-border px-md py-3',
            rowIdx % 2 !== 0 ? 'bg-surface' : 'bg-surface-elevated',
          )}
        >
          {Array.from({ length: columnCount }, (_, colIdx) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
              key={colIdx}
              className="flex flex-1 items-center gap-xs px-xs"
            >
              {colIdx === 0 && showLeadingVisual && (
                <Skeleton className="h-8 w-8 shrink-0 rounded" />
              )}
              <Skeleton
                className={cn('h-4', CELL_WIDTHS[(rowIdx * 2 + colIdx) % CELL_WIDTHS.length])}
              />
            </div>
          ))}

          {showActions && (
            <div
              className="flex shrink-0 justify-center gap-xs"
              style={{ width: uiConfig.grid.actionsColumnWidth }}
            >
              {Array.from({ length: actionCount }, (_, i) => (
                <Skeleton
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
                  key={i}
                  className="h-8 w-8 rounded"
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* ── Pager ────────────────────────────────────────────────────────── */}
      {showPager && (
        <div className="mt-auto flex items-center justify-end gap-sm border-t border-border px-md py-sm">
          <Skeleton className="h-4 w-28" />
          <div className="flex gap-xs">
            {Array.from({ length: PAGER_BUTTON_COUNT }, (_, i) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
                key={i}
                className="h-7 w-7"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
