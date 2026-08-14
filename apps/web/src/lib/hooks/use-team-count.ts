import { useQuery } from '@tanstack/react-query';
import { queryCacheConfig } from '@/lib/http/query-config';
import { getApiTeams } from '@/proxy/services/teams/teams';

/**
 * Fetches just the total team count for a club — used to pre-populate a
 * SelectBox/TagBox placeholder before the user opens the dropdown.
 */
export function useTeamCount(clubId: string | null | undefined, pageSize: number) {
  return useQuery({
    queryKey: ['teams-initial', clubId, pageSize] as const,
    queryFn: () => getApiTeams({ ClubId: clubId ?? undefined, Page: 1, PageSize: pageSize }),
    enabled: !!clubId,
    ...queryCacheConfig.list,
  });
}
