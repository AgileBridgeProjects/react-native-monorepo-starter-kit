import { seasonDatasource } from '@features/clubs/infrastructure/datasources/season-datasource';
import { queryCacheConfig } from '@lib/http/query-config';
import { useQuery } from '@tanstack/react-query';

/**
 * Fetches the current/active season for a club — used to show the season indicator
 * (AC #1.2) and to resolve the seasonId a new team is created under. Disabled until
 * a clubId is chosen.
 */
export function useCurrentSeason(clubId: string | null) {
  return useQuery({
    queryKey: ['seasons', 'current', clubId] as const,
    queryFn: () => seasonDatasource.getCurrent(clubId as string),
    enabled: !!clubId,
    ...queryCacheConfig.static,
  });
}
