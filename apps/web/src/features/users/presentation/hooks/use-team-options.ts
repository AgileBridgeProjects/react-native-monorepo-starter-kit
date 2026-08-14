import { userDatasource } from '@features/users/infrastructure/datasources/user-datasource';
import { queryCacheConfig } from '@lib/http/query-config';
import { useQuery } from '@tanstack/react-query';

/**
 * Fetches the list of teams for a given club for use in the
 * team filter dropdown. Returns `undefined` while loading or when
 * `clubId` is null (query is disabled). Consumers should default via
 * destructuring, e.g. `const { data: teams = [] } = useTeamOptions(clubId)`.
 */
export function useTeamOptions(clubId: string | null) {
  return useQuery({
    queryKey: ['teams', 'options', clubId],
    queryFn: () => userDatasource.listTeams(clubId as string),
    enabled: !!clubId,
    ...queryCacheConfig.list,
  });
}
