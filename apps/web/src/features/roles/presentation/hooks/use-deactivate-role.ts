import { roleDatasource } from '@features/roles/infrastructure/datasources/role-datasource';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useDeactivateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => roleDatasource.deactivate(id),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
      void queryClient.invalidateQueries({ queryKey: ['role-assignments', id] });
    },
  });
}
