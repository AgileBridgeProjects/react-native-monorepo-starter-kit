import CustomStore from 'devextreme/data/custom_store';
import DataSource from 'devextreme/data/data_source';

interface ListResult<T> {
  items?: T[] | null;
  /** Total record count for the query — enables virtual scrolling when paginate:true.
   *  Accepts string | number because Orval generates numeric response fields as that union. */
  totalCount?: string | number;
}

export interface CreateSelectStoreOptions {
  /**
   * Enable server-side pagination.
   *
   * When `true`, the store is returned as a `DataSource` with `paginate:true` and
   * `requireTotalCount:true`. The `listFn` will receive `skip` and `take` from
   * DX's `loadOptions` so the caller can convert them to page/pageSize for the backend.
   * The `listFn` must return `totalCount` in its response for virtual scrolling to work.
   *
   * When `false` (default), a plain `CustomStore` is returned and only `filterText`
   * is forwarded to `listFn`.
   */
  paginate?: boolean;
}

/**
 * Creates a DevExtreme `CustomStore` (or paginated `DataSource`) for SelectBox / TagBox
 * with server-side search.
 *
 * Wraps two API calls — a list endpoint (with `FilterText`) and a single-item GET —
 * behind a `CustomStore` with an in-memory cache so `byKey` lookups avoid extra
 * network calls when the item was already fetched by `load`.
 *
 * Basic usage (search only, no browse-pagination):
 *   const store = createSelectStore<TeamResponse>(
 *     (filterText) => getApiTeams({ ClubId: clubId, FilterText: filterText }),
 *     (id) => getApiTeamsId(id),
 *   );
 *
 * Paginated usage (browse + search):
 *   const store = createSelectStore<TeamResponse>(
 *     (filterText, skip, take) => {
 *       const pageSize = take ?? uiConfig.selectSearch.pageSize;
 *       const page = skip !== undefined && take ? Math.floor(skip / take) + 1 : 1;
 *       return getApiTeams({ FilterText: filterText, Page: page, PageSize: pageSize });
 *     },
 *     (id) => getApiTeamsId(id),
 *     { paginate: true },
 *   );
 *
 * @see docs/standards/frontend-web.md — Server-side search for dropdowns
 */
export function createSelectStore<T extends { id?: string }>(
  listFn: (filterText?: string, skip?: number, take?: number) => Promise<ListResult<T>>,
  getByIdFn: (id: string) => Promise<T>,
  options: { paginate: true },
): DataSource<T>;
export function createSelectStore<T extends { id?: string }>(
  listFn: (filterText?: string, skip?: number, take?: number) => Promise<ListResult<T>>,
  getByIdFn: (id: string) => Promise<T>,
  options?: { paginate?: false },
): CustomStore<T>;
export function createSelectStore<T extends { id?: string }>(
  listFn: (filterText?: string, skip?: number, take?: number) => Promise<ListResult<T>>,
  getByIdFn: (id: string) => Promise<T>,
  { paginate = false }: CreateSelectStoreOptions = {},
): CustomStore<T> | DataSource<T> {
  const cache = new Map<string, T>();

  const store = new CustomStore<T>({
    key: 'id',
    async load(loadOptions) {
      const searchValue = (loadOptions.searchValue as string) || undefined;
      const skip = typeof loadOptions.skip === 'number' ? loadOptions.skip : undefined;
      const take = typeof loadOptions.take === 'number' ? loadOptions.take : undefined;
      const result = await listFn(searchValue, skip, take);
      const items = result.items ?? [];
      for (const item of items) {
        if (item.id) cache.set(item.id, item);
      }
      if (result.totalCount !== undefined) {
        return { data: items, totalCount: Number(result.totalCount) };
      }
      return items;
    },
    async byKey(key) {
      const id = key as string;
      const cached = cache.get(id);
      if (cached) return cached;
      const item = await getByIdFn(id);
      if (item?.id) cache.set(item.id, item);
      return item;
    },
  });

  if (paginate) {
    return new DataSource<T>({ store, paginate: true, requireTotalCount: true });
  }

  return store;
}
