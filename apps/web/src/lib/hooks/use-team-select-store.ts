import { useMemo } from 'react';
import { createSelectStore } from '@/lib/http/create-select-store';
import { uiConfig } from '@/lib/ui-config';
import type { TeamResponse } from '@/proxy/models';
import { getApiTeams, getApiTeamsId } from '@/proxy/services/teams/teams';

/**
 * Creates a DevExtreme select store for team selection.
 *
 * - `string`    — club-scoped store (non-SuperAdmin users, scoped to their club)
 * - `null`      — unscoped store fetching all teams (SuperAdmin with no club restriction)
 * - `undefined` — returns `undefined`; caller should treat the TagBox as disabled
 */
export function useTeamSelectStore(clubId: string | null | undefined) {
  return useMemo(() => {
    if (clubId === undefined) return undefined;

    return createSelectStore<TeamResponse>(
      (filterText, skip, take) => {
        const pageSize = take ?? uiConfig.selectSearch.pageSize;
        const page =
          skip !== undefined && take !== undefined && take > 0 ? Math.floor(skip / take) + 1 : 1;
        return getApiTeams(
          clubId != null
            ? { ClubId: clubId, FilterText: filterText, Page: page, PageSize: pageSize }
            : { FilterText: filterText, Page: page, PageSize: pageSize },
        );
      },
      getApiTeamsId,
      { paginate: true },
    );
  }, [clubId]);
}
