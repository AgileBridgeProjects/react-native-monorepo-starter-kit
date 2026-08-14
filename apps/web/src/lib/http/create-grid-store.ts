import CustomStore from 'devextreme/data/custom_store';
import DataSource from 'devextreme/data/data_source';

export interface GridLoadResult<T> {
  items: T[];
  totalCount: number;
}

/** A single sort descriptor forwarded from DX to the load function. */
export interface GridSortItem {
  /** The column's `dataField` value. */
  selector: string;
  /** `true` means descending. */
  desc: boolean;
}

type GridLoadFn<T> = (
  page: number,
  pageSize: number,
  filterText?: string,
  sort?: GridSortItem[],
) => Promise<GridLoadResult<T>>;

/**
 * Extended DataSource that exposes `setSearch` for server-side text filtering.
 * DX's built-in `searchValue`/`searchExpr` mechanism only propagates to
 * `loadOptions.searchValue` when `searchExpr` is also configured, so we track
 * the filter text in a closure and expose `setSearch` instead.
 */
export interface GridStore<T> extends DataSource<T> {
  /** Set (or clear) the full-text filter and immediately trigger a reload. */
  setSearch(text: string | undefined): void;
}

/**
 * Creates a DevExtreme DataSource (wrapping a CustomStore) that drives
 * server-side paging, filtering, and sorting.
 *
 * Maps DevExtreme's `loadOptions` (skip/take/sort) plus a closure-based
 * `filterText` to the page/pageSize/filterText/sort parameters expected by
 * the StarterKit backend.  Call `store.setSearch('text')` to filter and
 * `store.setSearch(undefined)` to clear.  Call `store.reload()` after mutations.
 *
 * Usage:
 *   export const myStore = createGridStore((page, pageSize, filterText, sort) =>
 *     myDatasource.list(page, pageSize, filterText, sort),
 *   );
 *   // After a mutation:
 *   myStore.reload();
 *
 * @see docs/standards/frontend.md — DevExtreme › Server-side grid stores
 */
export function createGridStore<T>(loadFn: GridLoadFn<T>, pageSize = 50, key = 'id'): GridStore<T> {
  // Closure variable: updated by setSearch, read by every CustomStore load call.
  let currentFilterText: string | undefined;

  const store = new CustomStore<T>({
    key,
    async load(loadOptions) {
      if (!Number.isInteger(loadOptions.take) || (loadOptions.take as number) <= 0) {
        throw new Error(
          'createGridStore: loadOptions.take is missing. Ensure <EntityDataGrid> includes <Paging> (it does by default).',
        );
      }
      const take = loadOptions.take as number;
      const skip = loadOptions.skip ?? 0;
      const page = Math.floor(skip / take) + 1;
      // DX sends sort as an array; normalise to our GridSortItem shape.
      const sort = Array.isArray(loadOptions.sort)
        ? (loadOptions.sort as GridSortItem[])
        : undefined;
      const result = await loadFn(page, take, currentFilterText, sort);
      return { data: result.items, totalCount: result.totalCount };
    },
  });

  const dataSource = new DataSource<T>({ store, requireTotalCount: true, pageSize });

  const gridStore = dataSource as GridStore<T>;
  gridStore.setSearch = (text: string | undefined) => {
    currentFilterText = text || undefined;
    void dataSource.reload();
  };

  return gridStore;
}
