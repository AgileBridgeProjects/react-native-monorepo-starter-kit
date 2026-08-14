'use client';

import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { DeleteIcon, EditIcon, InfoIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import type DxDataGrid from 'devextreme/ui/data_grid';
import type { RowPreparedEvent } from 'devextreme/ui/data_grid';
import {
  Column,
  Export,
  Item,
  Pager,
  Paging,
  Selection,
  Toolbar,
} from 'devextreme-react/data-grid';
import { type ReactNode, useImperativeHandle, useRef, useState } from 'react';
import type { ColumnDef } from '@/types/data-grid';
import { ActionMenu, type ActionMenuItem } from './action-menu';
import { EmptyState } from './empty-state';
import { GridSearchBox } from './grid-search-box';
import { NewButton } from './new-button';
import { StandardDataGrid } from './standard-data-grid';
import { notify } from './toast';

// biome-ignore lint/suspicious/noExplicitAny: DX DataSource/Store are not generically typed; runtime accepts both
type GridDataSource = any;

export type { ColumnDef };

/** Imperative handle exposed via ref for programmatic grid control. */
export interface EntityDataGridHandle {
  clearSelection(): void;
  /** Returns the data objects for the currently selected rows. */
  getSelectedRowsData(): unknown[];
  /** Returns all currently displayed row data objects. */
  getAllRows(): unknown[];
}

interface EntityDataGridProps<T extends object> {
  /** Array of domain objects OR a DevExtreme CustomStore/DataSource for server-side paging. */
  dataSource: GridDataSource;
  columns: ColumnDef<T>[];
  /** The field used as the unique row key. Defaults to "id". */
  keyExpr?: string;
  /** Called when the user clicks Edit on a row. Omit to hide the edit action. */
  onEdit?: (row: T) => void;
  /** Called when the user clicks Delete on a row. Omit to hide the delete action. */
  onDelete?: (row: T) => void;
  /** Called when the user clicks View on a row. Renders an info icon. Omit to hide. */
  onView?: (row: T) => void;
  /** Called when the user clicks anywhere on a row. Omit to disable row-click navigation. */
  onRowClick?: (row: T) => void;
  /** Called when the user clicks the Add button in the toolbar. Omit to hide the button. */
  onAdd?: () => void;
  /** Override the default load-error toast message. Defaults to common:grid.loadError. */
  errorMessage?: string;
  /** Override the default empty-grid text. Defaults to common:grid.noRecords. */
  noDataText?: string;
  /** External loading flag — used when dataSource is a plain array driven by a React Query hook. */
  isLoading?: boolean;
  pageSize?: number;
  addButtonLabel?: string;
  className?: string;
  /** Enable row selection. "multiple" shows checkboxes. */
  selectionMode?: 'none' | 'single' | 'multiple';
  /** Fires when the selection changes with the new keys array. */
  onSelectionChanged?: (keys: string[]) => void;
  /** Imperative handle for programmatic control (e.g. clearing selection). */
  gridRef?: React.Ref<EntityDataGridHandle>;
  /** Extra toolbar items rendered after the search input (location="after"). */
  toolbarItems?: ReactNode;
  /** Allow columns to collapse into an adaptive detail row on narrow screens. Defaults to true. */
  columnHidingEnabled?: boolean;
  /** Controlled selected row keys — drives checkbox state from the parent. */
  selectedKeys?: string[];
  /** Whether to show the empty-state block (in place of the rows) when there are no records. Defaults to true. */
  showEmptyOverlay?: boolean;
  /** Icon shown above the empty-state message. Omit for no icon. */
  emptyStateIcon?: ReactNode;
  /** Additional action items appended after the built-in view/edit/delete actions. Receives the row data so items can vary per row. */
  extraActions?: (row: T) => ActionMenuItem[];
  /** Auto-size each column to its content width. Defaults to true. Set to false to let columns without an explicit width fill the remaining space. */
  columnAutoWidth?: boolean;
  /** Fired when each row is prepared — use to apply per-row CSS classes or styles (e.g. opacity for excluded rows). */
  // biome-ignore lint/suspicious/noExplicitAny: DX row type varies by data shape
  onRowPrepared?: (e: RowPreparedEvent<any, string>) => void;
  /** Enable the built-in DevExtreme Excel export button in the toolbar. */
  exportEnabled?: boolean;
  /** Hide the built-in search input — use when the parent already provides external filtering. */
  hideSearch?: boolean;
  /** Remote operations override. Defaults to { paging: true, filtering: true, sorting: true } for
   *  CustomStore/DataSource usage. Pass false to enable full client-side operations — correct for
   *  plain-array data sources that are already fully loaded client-side. */
  remoteOperations?: false | { paging?: boolean; filtering?: boolean; sorting?: boolean };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EntityDataGrid<T extends object>({
  dataSource,
  columns,
  keyExpr = 'id',
  onEdit,
  onDelete,
  onView,
  onRowClick,
  onAdd,
  errorMessage,
  noDataText,
  isLoading: isLoadingProp,
  pageSize = 50,
  addButtonLabel,
  className,
  selectionMode = 'none',
  onSelectionChanged,
  gridRef,
  toolbarItems,
  columnHidingEnabled: columnHidingEnabledProp = true,
  selectedKeys,
  extraActions,
  showEmptyOverlay = true,
  emptyStateIcon,
  columnAutoWidth = true,
  onRowPrepared,
  exportEnabled = false,
  hideSearch = false,
  remoteOperations: remoteOperationsProp,
}: EntityDataGridProps<T>) {
  const { t } = useTranslation();
  const hasActions = Boolean(onEdit ?? onDelete ?? onView ?? extraActions);

  const [searchText, setSearchText] = useState('');
  const [isEmpty, setIsEmpty] = useState(false);
  // Guard against the overlay flashing before the first data load completes.
  const [isFirstLoadComplete, setIsFirstLoadComplete] = useState(false);
  // Dedup load-error toasts: DX can fire onDataErrorOccurred multiple times per failed
  // load cycle (e.g. StrictMode double-mount + internal retries). One toast per 3 s is enough.
  const lastErrorToastRef = useRef<number>(0);

  // DX DataGrid instance ref for programmatic control (e.g. clearSelection).
  const dxGridRef = useRef<DxDataGrid>(null);

  useImperativeHandle(gridRef, () => ({
    clearSelection() {
      dxGridRef.current?.clearSelection();
    },
    getSelectedRowsData() {
      return dxGridRef.current?.getSelectedRowsData() ?? [];
    },
    getAllRows() {
      return dxGridRef.current?.getVisibleRows().map((r) => r.data) ?? [];
    },
  }));

  // Rendered in normal document flow, right where DX's own (suppressed) "no data" row would
  // sit — NOT an absolutely-positioned overlay. An absolute overlay would cover the toolbar and
  // pager too, since it's positioned relative to the whole grid wrapper, not just the rows area.
  const emptyOverlay =
    showEmptyOverlay && isFirstLoadComplete && !isLoadingProp && isEmpty ? (
      <div className="flex items-center justify-center py-6">
        <EmptyState
          surface="bare"
          icon={emptyStateIcon}
          description={t('common:grid.noRecords')}
          action={onAdd ? <NewButton label={addButtonLabel} onClick={onAdd} /> : undefined}
          className="gap-2 p-0"
        />
      </div>
    ) : undefined;

  return (
    <StandardDataGrid<T>
      dataSource={dataSource}
      keyExpr={keyExpr}
      isLoading={isLoadingProp}
      skeletonColumnCount={columns.length}
      skeletonActionCount={[onView, onEdit, onDelete].filter(Boolean).length}
      skeletonShowToolbar
      skeletonShowPager
      skeletonShowAddButton={Boolean(onAdd)}
      // Suppress DX's own inline "no data" text when our custom empty-state overlay
      // is enabled — otherwise both render at once.
      noDataText={showEmptyOverlay ? '' : (noDataText ?? t('common:grid.noRecords'))}
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-surface-elevated',
        selectionMode === 'none' && 'dx-grid-select-hidden',
        showEmptyOverlay && 'dx-grid-empty-collapsed',
        className,
      )}
      columnAutoWidth={columnAutoWidth}
      columnHidingEnabled={columnHidingEnabledProp}
      gridClassName={onRowClick ? 'dx-row-clickable' : undefined}
      onInitialized={(component) => {
        dxGridRef.current = component;
      }}
      onContentReady={(component) => {
        setIsFirstLoadComplete(true);
        setIsEmpty(component.totalCount() === 0);
      }}
      onRowClick={
        onRowClick
          ? (e) => {
              // Prevent row navigation when an action button (or child) was clicked.
              const target = e.event?.target as HTMLElement | undefined;
              if (target?.closest?.('.dx-button')) return;
              onRowClick(e.data as T);
            }
          : undefined
      }
      onRowPrepared={onRowPrepared}
      onDataErrorOccurred={() => {
        const now = Date.now();
        if (now - lastErrorToastRef.current > 3000) {
          lastErrorToastRef.current = now;
          notify(
            errorMessage ?? t('common:grid.loadError'),
            'error',
            uiConfig.toast.errorDurationMs,
          );
        }
      }}
      selectedRowKeys={selectedKeys}
      onSelectionChanged={
        onSelectionChanged ? (e) => onSelectionChanged(e.selectedRowKeys as string[]) : undefined
      }
      remoteOperations={
        remoteOperationsProp === false
          ? undefined
          : (remoteOperationsProp ?? { paging: true, filtering: true, sorting: true })
      }
      overlay={emptyOverlay}
    >
      {exportEnabled && <Export enabled allowExportSelectedData={false} />}

      {/* Row selection — only emitted when selection is actually enabled. When the grid is
          'none', omitting <Selection> avoids DX injecting a flexible (width:auto) command-select
          column; that hidden column would otherwise soak up all the leftover width under
          columnAutoWidth={false}, leaving the real columns stuck at their minWidth instead of
          stretching to fill the grid (ABC-123). */}
      {selectionMode !== 'none' && (
        <Selection mode={selectionMode} selectAllMode="page" showCheckBoxesMode="always" />
      )}
      <Paging defaultPageSize={pageSize} />
      <Pager
        showPageSizeSelector
        allowedPageSizes={uiConfig.grid.allowedPageSizes}
        showInfo
        showNavigationButtons
      />

      {/* Toolbar — custom search input + button replaces DX SearchPanel */}
      <Toolbar>
        {!hideSearch && (
          <Item
            location="before"
            render={() => (
              <GridSearchBox
                value={searchText}
                onValueChange={setSearchText}
                onSearch={(v) => {
                  if (typeof dataSource?.setSearch === 'function') {
                    dataSource.setSearch(v || undefined);
                  }
                }}
              />
            )}
          />
        )}
        {onAdd && (
          <Item
            location="after"
            render={() => <NewButton label={addButtonLabel} onClick={onAdd} />}
          />
        )}
        {toolbarItems && <Item location="after" render={() => toolbarItems} />}
      </Toolbar>

      {/* Data columns */}
      {columns.map((col) => (
        <Column
          key={col.key ?? col.dataField}
          name={col.name}
          dataField={col.dataField}
          caption={col.caption}
          width={col.width}
          minWidth={col.minWidth}
          dataType={col.dataType}
          // biome-ignore lint/suspicious/noExplicitAny: DX generic types don't align with our generic T
          cellRender={col.cellRender as any}
          alignment={col.alignment}
          allowSorting={col.allowSorting}
          sortOrder={col.sortOrder}
          calculateSortValue={col.calculateSortValue}
          groupIndex={col.groupIndex}
          // biome-ignore lint/suspicious/noExplicitAny: DX generic types don't align with our generic T
          calculateGroupValue={col.calculateGroupValue as any}
          hidingPriority={columnHidingEnabledProp ? col.hidingPriority : undefined}
          fixed={col.fixed}
          fixedPosition={col.fixedPosition}
          headerCellRender={col.headerCellRender}
          cssClass={col.cssClass}
        />
      ))}

      {/* Actions column — only rendered when at least one action is provided */}
      {hasActions && (
        <Column
          caption=""
          width={52}
          alignment="center"
          allowSorting={false}
          allowFiltering={false}
          fixed={columnAutoWidth}
          fixedPosition={columnAutoWidth ? 'right' : undefined}
          cssClass="actions-col"
          cellRender={({ data }: { data: T }) => (
            <ActionMenu
              aria-label={t('common:grid.actions')}
              items={[
                ...(onView
                  ? [
                      {
                        label: t('common:grid.view'),
                        icon: <InfoIcon size={iconSize.xs} />,
                        onClick: () => onView(data),
                      },
                    ]
                  : []),
                ...(onEdit
                  ? [
                      {
                        label: t('common:grid.edit'),
                        icon: <EditIcon size={iconSize.xs} />,
                        onClick: () => onEdit(data),
                      },
                    ]
                  : []),
                ...(onDelete
                  ? [
                      {
                        label: t('common:grid.delete'),
                        icon: <DeleteIcon size={iconSize.xs} />,
                        onClick: () => onDelete(data),
                        variant: 'destructive' as const,
                      },
                    ]
                  : []),
                ...(extraActions ? extraActions(data) : []),
              ]}
            />
          )}
        />
      )}
    </StandardDataGrid>
  );
}

export type { EntityDataGridProps };
