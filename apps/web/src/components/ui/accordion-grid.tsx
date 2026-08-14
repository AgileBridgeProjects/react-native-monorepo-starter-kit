'use client';

import { useTranslation } from '@lib/i18n';
import { ChevronRightIcon, ExpandLessIcon, ExpandMoreIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { AccordionGridChildSkeleton } from './accordion-grid-child-skeleton';
import { AccordionGridSkeleton, type AccordionGridSkeletonConfig } from './accordion-grid-skeleton';
import { AsyncView } from './async-view';
import { Button } from './button';
import { Typography } from './typography';

export type SortDirection = 'asc' | 'desc' | null;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccordionGridParent<TParent, TChild> {
  /** Unique key for this parent row. */
  id: string;
  /** The parent data object. */
  data: TParent;
  /** Children to display when expanded. Undefined = not yet loaded (shows spinner on expand). */
  children?: TChild[];
}

export interface AccordionGridProps<TParent, TChild> {
  /** Data items with parent + children structure. */
  items: AccordionGridParent<TParent, TChild>[];
  /** Column header label. */
  headerLabel?: string;
  /** Render the parent row content (title area). */
  renderParent: (parent: TParent, isExpanded: boolean) => ReactNode;
  /** Render trailing content for a parent row (badges, actions). */
  renderParentEnd?: (parent: TParent) => ReactNode;
  /** Render a child row content (title area). */
  renderChild: (child: TChild, parent: TParent) => ReactNode;
  /** Render trailing content for a child row (badges, actions). */
  renderChildEnd?: (child: TChild, parent: TParent) => ReactNode;
  /** Called when a parent row is expanded. Use this to trigger lazy loading of children. */
  onExpand?: (parent: TParent, id: string) => void;
  /** Called when a parent row is clicked (not on the actions area). */
  onParentClick?: (parent: TParent) => void;
  /** When true, only one parent can be expanded at a time. Default: false. */
  singleExpand?: boolean;
  /** Unique key extractor for child rows. Defaults to index-based keys. */
  childKeyExpr?: (child: TChild) => string;
  /** Class name applied to the root container. */
  className?: string;
  /** Optional class name applied to each parent row wrapper. */
  parentRowClassName?: string;
  /** Optional class name applied to the clickable parent row header. */
  parentHeaderClassName?: string;
  /** Optional class name applied to the parent content container. */
  parentContentClassName?: string;
  /** Optional class name applied to the parent trailing-content container. */
  parentEndClassName?: string;
  /** Test ID for the root element. */
  'data-testid'?: string;
  /** Show loading state. */
  isLoading?: boolean;
  /** Controls the structure-matched placeholders shown during initial and child loading. */
  skeletonConfig?: AccordionGridSkeletonConfig;
  /** Empty state content. */
  emptyState?: ReactNode;
  /** Extract a string key from parent data for sorting by the header column. Enables the sortable header. */
  sortKey?: (parent: TParent) => string;
  /** Set of selected parent IDs. When provided, checkboxes are shown. */
  selectedIds?: Set<string>;
  /** Called when the selection changes. */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /**
   * Returns the accessible label for a row's checkbox. Defaults to a generic
   * "Select item" label; supply a real name (e.g. the row title) for screen-reader
   * users so each checkbox is uniquely identifiable.
   */
  getRowLabel?: (parent: TParent) => string;
  /** Optional custom header row content. When provided, replaces the default title header. */
  headerContent?: ReactNode;
  /** Controls whether tree connector lines are rendered for expanded child rows. */
  showTreeConnectors?: boolean;
  /**
   * @deprecated No longer needed — child rows automatically mirror the parent
   * row column structure. This prop is ignored.
   */
  childRowPaddingClassName?: string;
  /** When false, rows are rendered without expand/collapse behavior. */
  collapsible?: boolean;
  /** When true, the trailing actions area is sticky at the right edge with a solid background. */
  stickyEnd?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AccordionGrid<TParent, TChild>({
  items,
  headerLabel,
  renderParent,
  renderParentEnd,
  renderChild,
  renderChildEnd,
  onExpand,
  onParentClick,
  singleExpand = false,
  childKeyExpr,
  className,
  parentRowClassName,
  parentHeaderClassName,
  parentContentClassName,
  parentEndClassName,
  'data-testid': testId,
  isLoading,
  skeletonConfig,
  emptyState,
  sortKey,
  selectedIds,
  onSelectionChange,
  getRowLabel,
  headerContent,
  showTreeConnectors = true,
  collapsible = true,
  stickyEnd = false,
}: AccordionGridProps<TParent, TChild>) {
  const { t } = useTranslation();
  const resolvedHeaderLabel = headerLabel ?? t('common:grid.name');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const selectable = selectedIds !== undefined && onSelectionChange !== undefined;

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const isAllSelected =
    selectable && allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const isSomeSelected = selectable && !isAllSelected && allIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (isAllSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allIds));
    }
  }, [onSelectionChange, isAllSelected, allIds]);

  const toggleSelectOne = useCallback(
    (id: string) => {
      if (!onSelectionChange || !selectedIds) return;
      const next = new Set(selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange(next);
    },
    [onSelectionChange, selectedIds],
  );

  const sortedItems = useMemo(() => {
    if (!sortKey || !sortDirection) return items;
    return [...items].sort((a, b) => {
      const aKey = sortKey(a.data);
      const bKey = sortKey(b.data);
      const cmp = aKey.localeCompare(bKey, undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [items, sortKey, sortDirection]);

  const handleHeaderSort = useCallback(() => {
    if (!sortKey) return;
    setSortDirection((prev) => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });
  }, [sortKey]);

  const toggleExpand = useCallback(
    (id: string, parent: TParent) => {
      const willExpand = !expandedIds.has(id);
      setExpandedIds((prev) => {
        const next = new Set(singleExpand ? [] : prev);
        if (prev.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      if (willExpand) onExpand?.(parent, id);
    },
    [expandedIds, singleExpand, onExpand],
  );

  const getChildKey = useCallback(
    (child: TChild, parentId: string, index: number) =>
      childKeyExpr ? childKeyExpr(child) : `${parentId}-${index}`,
    [childKeyExpr],
  );

  const loadingSkeleton = (
    <AccordionGridSkeleton
      {...skeletonConfig}
      showActions={skeletonConfig?.showActions ?? renderParentEnd !== undefined}
      selectable={selectable}
      className={className}
    />
  );

  const emptyView = emptyState ? (
    <div
      className={cn('flex flex-1 flex-col items-center justify-center p-8 text-center', className)}
      data-testid={testId}
    >
      {emptyState}
    </div>
  ) : undefined;

  return (
    <AsyncView
      isLoading={isLoading}
      hasData={items.length > 0}
      loading={loadingSkeleton}
      emptyState={emptyView}
    >
      <div
        className={cn('rounded-lg border border-border bg-surface-elevated', className)}
        data-testid={testId}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          {selectable && (
            <label className="flex w-3.5 shrink-0 cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isSomeSelected;
                }}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 cursor-pointer appearance-none rounded-sm border border-border-strong bg-transparent checked:appearance-auto checked:accent-primary indeterminate:appearance-auto indeterminate:accent-primary"
                aria-label={t('common:actions.selectAll')}
                data-testid="accordion-grid-select-all"
              />
            </label>
          )}
          {/* Spacer matching the expand-chevron column (w-5) in parent rows */}
          <div className="w-5 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            {headerContent ?? (
              <>
                {sortKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 px-0 text-xs font-medium uppercase text-text-muted hover:text-text"
                    onClick={handleHeaderSort}
                    aria-label={t('common:grid.sortBy', { name: resolvedHeaderLabel })}
                  >
                    {resolvedHeaderLabel}
                    <span className="inline-flex flex-col leading-none" aria-hidden="true">
                      <ExpandLessIcon
                        size={iconSize.xs}
                        className={cn(sortDirection === 'asc' ? 'text-text' : 'text-text-muted/40')}
                      />
                      <ExpandMoreIcon
                        size={iconSize.xs}
                        className={cn(
                          sortDirection === 'desc' ? 'text-text' : 'text-text-muted/40',
                        )}
                      />
                    </span>
                  </Button>
                )}
                {!sortKey && (
                  <Typography
                    variant="caption"
                    className="text-xs font-medium uppercase text-text-muted"
                  >
                    {resolvedHeaderLabel}
                  </Typography>
                )}
              </>
            )}
          </div>
        </div>

        {/* Rows */}
        <div role="tree">
          {sortedItems.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            const canExpand =
              collapsible &&
              (item.children === undefined || item.children.length > 0 || isExpanded);
            const children = item.children;

            return (
              <div
                key={`parent-${item.id}`}
                role="treeitem"
                tabIndex={0}
                aria-expanded={canExpand ? isExpanded : undefined}
                className={cn('odd:bg-surface even:bg-surface-elevated', parentRowClassName)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (canExpand) {
                      toggleExpand(item.id, item.data);
                    } else {
                      onParentClick?.(item.data);
                    }
                  }
                }}
              >
                {/* Parent row (clickable header) */}
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handler on parent treeitem */}
                {/* biome-ignore lint/a11y/noStaticElementInteractions: interactive role is on parent treeitem */}
                <div
                  className={cn(
                    'flex items-center gap-3 px-4 py-4',
                    canExpand && 'cursor-pointer hover:bg-surface-hover',
                    !canExpand && 'cursor-default',
                    parentHeaderClassName,
                  )}
                  onClick={() => {
                    if (canExpand) {
                      toggleExpand(item.id, item.data);
                    } else {
                      onParentClick?.(item.data);
                    }
                  }}
                  data-testid={`accordion-grid-parent-${item.id}`}
                >
                  {/* Row checkbox. onClick is stopPropagation only; real interactivity is the nested input. */}
                  {selectable && (
                    // biome-ignore lint/a11y/useKeyWithClickEvents: see above
                    <label
                      className="flex w-3.5 shrink-0 cursor-pointer items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(item.id) ?? false}
                        onChange={() => toggleSelectOne(item.id)}
                        className="h-3.5 w-3.5 cursor-pointer appearance-none rounded-sm border border-border-strong bg-transparent checked:appearance-auto checked:accent-primary"
                        aria-label={
                          getRowLabel
                            ? t('common:actions.selectRow', { name: getRowLabel(item.data) })
                            : t('common:actions.selectRow', { name: '' })
                        }
                        data-testid={`accordion-grid-select-${item.id}`}
                      />
                    </label>
                  )}

                  {/* Expand chevron */}
                  <span className="flex w-5 shrink-0 items-center justify-center">
                    {canExpand && (
                      <ChevronRightIcon
                        className={cn(
                          'h-4 w-4 text-text-muted transition-transform duration-150',
                          isExpanded && 'rotate-90',
                        )}
                        aria-hidden="true"
                      />
                    )}
                  </span>

                  {/* Parent content */}
                  <div className={cn('flex min-w-0 flex-1 items-center', parentContentClassName)}>
                    {renderParent(item.data, isExpanded)}
                  </div>

                  {/* Parent trailing content (badges, actions) */}
                  {renderParentEnd && (
                    // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only, not interactive
                    // biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation only
                    <div
                      className={cn(
                        'flex shrink-0 items-center gap-2',
                        stickyEnd && 'sticky right-0 z-10 bg-surface-elevated',
                        parentEndClassName,
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderParentEnd(item.data)}
                    </div>
                  )}
                </div>

                {/* Children group */}
                {canExpand && isExpanded && (
                  // biome-ignore lint/a11y/useSemanticElements: role="group" is correct for ARIA tree children; fieldset adds unwanted form semantics
                  <div role="group">
                    {children === undefined ? (
                      <AccordionGridChildSkeleton
                        rowCount={skeletonConfig?.childRowCount ?? 2}
                        selectable={selectable}
                        showActions={renderChildEnd !== undefined}
                        showTreeConnectors={showTreeConnectors}
                      />
                    ) : (
                      children.map((child, i) => {
                        const childKey = getChildKey(child, item.id, i);
                        const isLast = i === children.length - 1;
                        return (
                          <div
                            key={`child-${childKey}`}
                            role="treeitem"
                            tabIndex={-1}
                            className="flex items-start gap-3 pl-4 pr-4 py-2"
                            data-testid={`accordion-grid-child-${childKey}`}
                          >
                            {/*
                             * Spacer mirrors the parent row's checkbox column so the
                             * connector column always aligns with the parent chevron.
                             */}
                            {selectable && <div className="w-3.5 shrink-0" aria-hidden="true" />}

                            {/*
                             * Connector column — same width as the parent's chevron
                             * span (w-5). Lines are positioned with left-1/2 relative
                             * to this column, so they stay centered on the chevron
                             * regardless of whether checkboxes are shown.
                             */}
                            <div className="relative w-5 shrink-0 self-stretch" aria-hidden="true">
                              {showTreeConnectors && (
                                <>
                                  <div
                                    className={cn(
                                      'absolute left-1/2 top-0 w-px -translate-x-1/2 bg-border',
                                      isLast ? 'h-4' : 'h-full',
                                    )}
                                  />
                                  <div className="absolute left-1/2 top-4 h-px w-4 bg-border" />
                                </>
                              )}
                            </div>

                            {/* Child content */}
                            <div className="flex min-w-0 flex-1 items-start">
                              {renderChild(child, item.data)}
                            </div>

                            {/* Child trailing content (badges, actions) */}
                            {renderChildEnd && (
                              <div className="flex shrink-0 items-start gap-2">
                                {renderChildEnd(child, item.data)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AsyncView>
  );
}
