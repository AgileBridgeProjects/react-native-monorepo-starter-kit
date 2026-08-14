import type { ClubOption } from '@features/clubs/domain/entities/club-option';
import { clubDatasource } from '@features/clubs/infrastructure/datasources/club-datasource';
import { queryCacheConfig } from '@lib/http/query-config';
import { useQuery } from '@tanstack/react-query';

export type { ClubOption };

/**
 * Loads the list of clubs for the club filter dropdown.
 * Page size is left to the backend default (capped by MaxPageSize).
 * Replace with server-side FilterText autocomplete if the club count
 * grows beyond the backend page size ceiling.
 */
export function useClubOptions() {
  return useQuery<ClubOption[]>({
    queryKey: ['clubs', 'options'],
    queryFn: () => clubDatasource.listOptions(),
    ...queryCacheConfig.list,
  });
}
