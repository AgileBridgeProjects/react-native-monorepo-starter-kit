'use client';

import { cn } from '@starterkit/shared';
import type {
  default as DxDataGrid,
  RowClickEvent,
  RowPreparedEvent,
  SelectionChangedEvent,
} from 'devextreme/ui/data_grid';
import DataGrid, { Column, RemoteOperations } from 'devextreme-react/data-grid';
import { type ReactNode, useEffect, useState } from 'react';
import { GridSkeleton } from './grid-skeleton';

// biome-ignore lint/suspicious/noExplicitAny: DX DataSource/Store are not generically typed; runtime accepts both
type GridDataSource = any;

// ─── Props ───────────────────────────────────────────────────────────────────

interface StandardDataGridProps<T extends object> {
  /** Array of domain objects OR a DevExtreme CustomStore/DataSource for server-side paging. */
  dataSource: GridDataSource;
  /** Key field name for DX DataGrid. Defaults to "id". */
  keyExpr?: string;
  /** External loading flag — used when dataSource is a plain array driven by a React Query hook. */
  isLoading?: boolean;
  /** Number of columns for the loading skeleton (default 4). */
  skeletonColumnCount?: number;
  /** Number of action icons per row in the skeleton (default 0). */
  skeletonActionCount?: number;
  /** Whether the skeleton should show a toolbar row. Defaults to false. */
  skeletonShowToolbar?: boolean;
  /** Whether the skeleton should show a pager row. Defaults to false. */
  skeletonShowPager?: boolean;
  /** Whether the skeleton should show an Add button in the toolbar. Defaults to false. */
  skeletonShowAddButton?: boolean;
  /** Whether the skeleton should show a thumbnail placeholder in the first column. Defaults to false. */
  skeletonShowLeadingVisual?: boolean;
  /** Text shown when the grid has no data. */
  noDataText?: string;
  /** Extra attributes passed to the DX grid root element (e.g. data-testid). */
  elementAttr?: object;
  /** Column, Paging, and other DX configuration children. */
  children?: ReactNode;
  /** Extra class names on the outer wrapper div. */
  className?: string;
  /** Currently selected row keys (controlled selection). */
  selectedRowKeys?: string[];
  /** Fires when the selection changes. */
  onSelectionChanged?: (e: SelectionChangedEvent<T, string>) => void;
  /** Enable remote operations (paging, sorting, filtering) for server-side CustomStore usage. */
  remoteOperations?: { paging?: boolean; sorting?: boolean; filtering?: boolean };
  /** Enable auto column widths (DX columnAutoWidth). Defaults to false. */
  columnAutoWidth?: boolean;
  /** Allow columns to collapse into an adaptive detail row on narrow screens. Defaults to false. */
  columnHidingEnabled?: boolean;
  /** DX className applied to the inner DataGrid element. */
  gridClassName?: string;
  /** Fired when the DX grid instance is created — use to capture the component ref. */
  onInitialized?: (component: DxDataGrid) => void;
  /** Fired after each content render — receives the DX component. */
  onContentReady?: (component: DxDataGrid, element: HTMLElement | undefined) => void;
  /** Fired when a row is clicked. */
  onRowClick?: (e: RowClickEvent<T, string>) => void;
  /** Fired when a data-load error occurs. */
  onDataErrorOccurred?: () => void;
  /** Fired when each row is prepared — use to apply per-row CSS classes or styles. */
  // biome-ignore lint/suspicious/noExplicitAny: DX row type varies by data shape
  onRowPrepared?: (e: RowPreparedEvent<any, string>) => void;
  /** Custom scrolling config. Defaults to { useNative: true }. */
  scrolling?: object;
  /** Overlay content rendered after the DataGrid (e.g. empty-state). */
  overlay?: ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Shared DataGrid shell that applies accordion-matching styles (standard-dx-grid CSS class),
 * strips the DX adaptive-expand ellipsis, and renders a skeleton overlay while loading.
 *
 * Usage:
 * ```tsx
 * <StandardDataGrid dataSource={items} isLoading={isLoading} noDataText="No items">
 *   <Paging enabled={false} />
 *   <Column ... />
 * </StandardDataGrid>
 * ```
 */
export function StandardDataGrid<T extends object>({
  dataSource,
  keyExpr,
  isLoading: isLoadingProp,
  skeletonColumnCount = 4,
  skeletonActionCount = 0,
  skeletonShowToolbar = false,
  skeletonShowPager = false,
  skeletonShowAddButton = false,
  skeletonShowLeadingVisual = false,
  noDataText,
  elementAttr,
  children,
  className,
  selectedRowKeys,
  onSelectionChanged,
  remoteOperations,
  columnAutoWidth = false,
  columnHidingEnabled = false,
  gridClassName,
  onInitialized,
  onContentReady: onContentReadyProp,
  onRowClick,
  onDataErrorOccurred,
  onRowPrepared,
  scrolling,
  overlay,
}: StandardDataGridProps<T>) {
  // Track DataSource loading state to drive the skeleton overlay for CustomStore usage.
  const [hasContentReady, setHasContentReady] = useState(!dataSource?.on);

  useEffect(() => {
    // Reset when the dataSource reference changes (e.g. filter changed).
    setHasContentReady(!dataSource?.on);
  }, [dataSource]);

  const isLoading = isLoadingProp || !hasContentReady;

  return (
    <div className={cn('standard-dx-grid relative', className)}>
      {isLoading && (
        <GridSkeleton
          columnCount={skeletonColumnCount}
          actionCount={skeletonActionCount}
          showToolbar={skeletonShowToolbar}
          showPager={skeletonShowPager}
          showAddButton={skeletonShowAddButton}
          showLeadingVisual={skeletonShowLeadingVisual}
        />
      )}
      {/* Keep DataGrid mounted while loading so the CustomStore fetch can fire and
          onContentReady can flip hasContentReady — just hide it from view. */}
      <div className={cn(isLoading && 'invisible absolute inset-0 overflow-hidden')}>
        <DataGrid
          dataSource={dataSource}
          keyExpr={keyExpr ?? (dataSource?.on ? undefined : 'id')}
          showBorders={false}
          showColumnLines={false}
          showRowLines={false}
          rowAlternationEnabled={true}
          columnAutoWidth={columnAutoWidth}
          columnHidingEnabled={columnHidingEnabled}
          allowColumnResizing={false}
          width="100%"
          scrolling={scrolling ?? { useNative: true }}
          loadPanel={{ enabled: false }}
          noDataText={noDataText}
          elementAttr={elementAttr}
          {...(selectedRowKeys !== undefined && { selectedRowKeys })}
          onSelectionChanged={onSelectionChanged}
          className={gridClassName}
          onInitialized={
            onInitialized ? (e) => onInitialized(e.component as DxDataGrid) : undefined
          }
          onContentReady={(e) => {
            setHasContentReady(true);
            // DX injects adaptive-expand cells even when columnHidingEnabled=false.
            // Remove them from the DOM to prevent the horizontal "..." ellipsis button.
            const el = e.element as HTMLElement | undefined;
            el?.querySelectorAll<Element>(
              '.dx-command-adaptive, .dx-command-adaptive-hidden',
            ).forEach((cell) => {
              cell.remove();
            });
            onContentReadyProp?.(e.component as DxDataGrid, el);
          }}
          onRowClick={onRowClick}
          onRowPrepared={onRowPrepared}
          onDataErrorOccurred={onDataErrorOccurred}
        >
          {remoteOperations && (
            <RemoteOperations
              paging={remoteOperations.paging}
              sorting={remoteOperations.sorting}
              filtering={remoteOperations.filtering}
            />
          )}
          {children}
          {/* Suppress the adaptive detail column — prevents DX "..." expand buttons */}
          <Column type="adaptive" visible={false} />
        </DataGrid>
      </div>
      {overlay}
    </div>
  );
}
