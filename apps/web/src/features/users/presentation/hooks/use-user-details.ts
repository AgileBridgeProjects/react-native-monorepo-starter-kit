import { queryCacheConfig } from '@lib/http/query-config';
import { useQuery } from '@tanstack/react-query';
import { userDatasource } from '../../infrastructure/datasources/user-datasource';

/**
 * Fetches full user details by id — including `dependentUserIds`, which is only populated on
 * this single-user endpoint, not the paginated list.
 */
export function useUserDetails(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['users', userId, 'details'],
    queryFn: () => userDatasource.getById(userId as string),
    enabled: enabled && !!userId,
    ...queryCacheConfig.list,
  });
}
