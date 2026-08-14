import { roleDatasource } from '@features/roles/infrastructure/datasources/role-datasource';
import { useMutation } from '@tanstack/react-query';

export function useUpdateRolePermissions() {
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      roleDatasource.updatePermissions(id, permissions),
  });
}
