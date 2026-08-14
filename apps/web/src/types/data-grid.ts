/**
 * Shared column definition type for DevExtreme DataGrid wrappers.
 * Used by EntityDataGrid and any future grid components across the web app.
 */
export interface ColumnDef<T extends object = Record<string, unknown>> {
  /**
   * Stable identifier used as the React key in `columns.map()`.
   * Required when `dataField` is absent (e.g. action-only columns).
   * Falls back to `dataField` when omitted.
   */
  key?: string;
  /**
   * DevExtreme column `name` — required when two columns share the same `dataField`
   * (e.g. a numeric column and a progress-bar column both reading participationRate).
   * Without it DX cannot distinguish the two and renders both identically.
   */
  name?: string;
  dataField?: Extract<keyof T, string>;
  caption?: string;
  width?: number | string;
  minWidth?: number;
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'datetime';
  // biome-ignore lint/suspicious/noExplicitAny: DX generic types don't align with our generic T
  cellRender?: (cellData: { data: T; value: any }) => React.ReactNode;
  alignment?: 'left' | 'center' | 'right';
  allowSorting?: boolean;
  sortOrder?: 'asc' | 'desc';
  // biome-ignore lint/suspicious/noExplicitAny: DX calculateSortValue receives generic row data
  calculateSortValue?: (data: T) => any;
  /**
   * Column hiding priority for responsive behaviour.
   * Lower number = hides first when the grid is narrow.
   * Omit to keep the column always visible.
   */
  hidingPriority?: number;
  /** Pin this column so it stays visible during horizontal scroll. */
  fixed?: boolean;
  /** Which side to pin to. Defaults to 'left'. */
  fixedPosition?: 'left' | 'right';
  /** Custom header cell renderer. */
  headerCellRender?: () => React.ReactNode;
  /** CSS class applied to both the header and data cells of this column. */
  cssClass?: string;
  /** Group rows by this column at the given level (0 = first/outermost grouping level). */
  groupIndex?: number;
  /** Computes the grouping key (e.g. coalesce a null value into a "No topic" bucket). */
  // biome-ignore lint/suspicious/noExplicitAny: DX calculateGroupValue receives generic row data
  calculateGroupValue?: (data: T) => any;
}
