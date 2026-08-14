import { queryCacheConfig } from '@lib/http/query-config';
import { useQuery } from '@tanstack/react-query';
import { userDatasource } from '../../infrastructure/datasources/user-datasource';

export function useUserDefaults() {
  return useQuery({
    queryKey: ['user-defaults'],
    queryFn: () => userDatasource.getDefaults(),
    ...queryCacheConfig.static,
  });
}
