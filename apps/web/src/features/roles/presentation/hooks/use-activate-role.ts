import { roleDatasource } from '@features/roles/infrastructure/datasources/role-datasource';
import { useMutation } from '@tanstack/react-query';

export function useActivateRole() {
  return useMutation({
    mutationFn: ({ id }: { id: string }) => roleDatasource.activate(id),
  });
}
