import { roleDatasource } from '@features/roles/infrastructure/datasources/role-datasource';
import { useMutation } from '@tanstack/react-query';

export function useCreateRole() {
  return useMutation({
    mutationFn: ({
      name,
      description,
      isElevated,
      isPortalRole,
      clubId,
    }: {
      name: string;
      description: string | null;
      isElevated: boolean;
      isPortalRole: boolean;
      clubId: string | null;
    }) => roleDatasource.create(name, description, isElevated, isPortalRole, clubId),
  });
}
