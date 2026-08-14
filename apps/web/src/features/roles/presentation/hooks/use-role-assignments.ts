import { roleDatasource } from '@features/roles/infrastructure/datasources/role-datasource';
import { useQuery } from '@tanstack/react-query';

export function useRoleAssignments(roleId: string | null) {
  return useQuery({
    queryKey: ['role-assignments', roleId],
    queryFn: () => roleDatasource.getAssignments(roleId as string),
    enabled: roleId !== null,
  });
}
