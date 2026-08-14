import { permissionGroupDatasource } from '@features/roles/infrastructure/datasources/permission-group-datasource';
import { queryCacheConfig } from '@lib/http/query-config';
import { useQuery } from '@tanstack/react-query';

export function usePermissionGroups() {
  return useQuery({
    queryKey: ['permission-groups'],
    queryFn: () => permissionGroupDatasource.list(),
    ...queryCacheConfig.static,
  });
}
