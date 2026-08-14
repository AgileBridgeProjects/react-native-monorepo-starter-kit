import { teamDatasource } from '@features/clubs/infrastructure/datasources/team-datasource';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamDatasource.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clubs', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['teams-initial'] });
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
