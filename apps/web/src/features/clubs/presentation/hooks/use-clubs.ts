import { clubDatasource } from '@features/clubs/infrastructure/datasources/club-datasource';
import type { GridSortItem } from '@lib/http/create-grid-store';
import { queryCacheConfig } from '@lib/http/query-config';
import { useQuery } from '@tanstack/react-query';

export interface UseClubsParams {
  page: number;
  pageSize: number;
  filterText?: string;
  sort?: GridSortItem[];
}

export function useClubs(params: UseClubsParams) {
  return useQuery({
    queryKey: ['clubs', 'list', params] as const,
    queryFn: () =>
      clubDatasource.list(params.page, params.pageSize, params.filterText, params.sort),
    ...queryCacheConfig.list,
  });
}
