import {
  createUserGridStore,
  type UserListFilter,
} from '@features/users/infrastructure/datasources/user-datasource';
import { useMemo } from 'react';

/**
 * Creates a memoised DevExtreme grid DataSource for the users list.
 * The store is recreated whenever clubId or teamId changes.
 * Call `store.reload()` after mutations.
 */
export function useUserGridStore(filter: UserListFilter) {
  const store = useMemo(
    () =>
      createUserGridStore({
        clubId: filter.clubId,
        teamId: filter.teamId,
        isActive: filter.isActive,
        authMethod: filter.authMethod,
        roleName: filter.roleName,
        setupStatus: filter.setupStatus,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      filter.clubId,
      filter.teamId,
      filter.isActive,
      filter.authMethod,
      filter.roleName,
      filter.setupStatus,
    ],
  );

  return { store };
}
