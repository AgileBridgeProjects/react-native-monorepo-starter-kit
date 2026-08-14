import { organisationsDatasource } from '@features/auth/infrastructure/datasources/organisations.datasource';
import { queryCacheConfig } from '@lib/http/query-config';
import { hapticSelection } from '@lib/utils/haptics';
import { useAuthStore } from '@store/auth-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const ORGANISATIONS_QUERY_KEY = ['auth', 'organisations'] as const;

/**
 * Fetches the list of organisations linked to the current user's Firebase UID.
 * Data lives in React Query cache — not duplicated into Zustand.
 */
export function useOrganisations(enabled = true) {
  return useQuery({
    queryKey: ORGANISATIONS_QUERY_KEY,
    queryFn: () => organisationsDatasource.getLinkedOrganisations(),
    ...queryCacheConfig.profile,
    retry: 1,
    enabled,
  });
}

/**
 * Returns a callback that switches the active organisation and invalidates the
 * tenant-scoped caches so they re-fetch under the new org.
 *
 * The org list itself is intentionally left intact — switching org does not
 * change which orgs the user belongs to, so re-fetching it is wasted work.
 */
export function useOrgSwitch() {
  const setActiveOrg = useAuthStore((s) => s.setActiveOrg);
  const queryClient = useQueryClient();

  return useCallback(
    (clubId: string) => {
      hapticSelection();
      setActiveOrg(clubId);

      // Invalidate every cached query except the org list itself — switching org does
      // not change which orgs the user belongs to, so re-fetching it is wasted work.
      const [orgsKeyRoot, orgsKeyLeaf] = ORGANISATIONS_QUERY_KEY;
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] !== orgsKeyRoot || query.queryKey[1] !== orgsKeyLeaf,
      });
    },
    [setActiveOrg, queryClient],
  );
}
