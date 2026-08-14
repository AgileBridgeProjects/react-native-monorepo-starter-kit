import { queryCacheConfig } from '@lib/http/query-config';
import { useQuery } from '@tanstack/react-query';
import { roleDatasource } from '../../infrastructure/datasources/role-datasource';

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => roleDatasource.list(),
    ...queryCacheConfig.static,
  });
}
