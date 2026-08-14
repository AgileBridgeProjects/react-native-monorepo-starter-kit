import { roleDatasource } from '@features/roles/infrastructure/datasources/role-datasource';
import { useMutation } from '@tanstack/react-query';

export function useUpdateRole() {
  return useMutation({
    mutationFn: ({
      id,
      name,
      description,
      isElevated,
      isPortalRole,
      clubId,
    }: {
      id: string;
      name: string;
      description: string | null;
      isElevated: boolean;
      isPortalRole: boolean;
      clubId: string | null;
    }) => roleDatasource.update(id, name, description, isElevated, isPortalRole, clubId),
  });
}
