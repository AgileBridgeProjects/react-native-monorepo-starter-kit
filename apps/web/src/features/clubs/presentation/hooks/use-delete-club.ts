import {
  clubDatasource,
  clubStore,
} from '@features/clubs/infrastructure/datasources/club-datasource';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useDeleteClub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clubDatasource.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clubs', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      void clubStore.reload();
    },
  });
}
