import { roleDatasource } from '@features/roles/infrastructure/datasources/role-datasource';
import { useQuery } from '@tanstack/react-query';

interface UseRolesOptions {
  includeInactive?: boolean;
}

export function useRoles({ includeInactive = false }: UseRolesOptions = {}) {
  return useQuery({
    queryKey: includeInactive ? ['roles', { includeInactive: true }] : ['roles'],
    queryFn: () => roleDatasource.list(includeInactive),
  });
}
