import { useMemo } from 'react';
import { createSelectStore } from '@/lib/http/create-select-store';
import type { ClubResponse } from '@/proxy/models';
import { getApiClubs, getApiClubsId } from '@/proxy/services/clubs/clubs';

/** @knipignore build-ahead: not yet consumed — wire up or remove. */
export function useClubSelectStore() {
  return useMemo(
    () =>
      createSelectStore<ClubResponse>(
        (filterText) => getApiClubs({ FilterText: filterText }),
        getApiClubsId,
      ),
    [],
  );
}
