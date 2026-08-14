import { useMemo } from 'react';
import { createSelectStore } from '@/lib/http/create-select-store';
import { uiConfig } from '@/lib/ui-config';
import type { UserResponse } from '@/proxy/models';
import { getApiUsers, getApiUsersId } from '@/proxy/services/users/users';

/**
 * Creates a DevExtreme select store scoped to Athlete users in a club — used by the
 * Parent "Linked Athlete(s)" multi-select.
 *
 * `undefined` clubId returns `undefined`; caller should treat the TagBox as disabled.
 */
export function useAthleteSelectStore(clubId: string | null | undefined) {
  return useMemo(() => {
    if (!clubId) return undefined;

    return createSelectStore<UserResponse>(
      (filterText, skip, take) => {
        const pageSize = take && take > 0 ? take : uiConfig.selectSearch.pageSize;
        const page =
          skip !== undefined && take !== undefined && take > 0 ? Math.floor(skip / take) + 1 : 1;
        return getApiUsers({
          ClubId: clubId,
          RoleName: 'Athlete',
          FilterText: filterText,
          Page: page,
          PageSize: pageSize,
        });
      },
      getApiUsersId,
      { paginate: true },
    );
  }, [clubId]);
}
