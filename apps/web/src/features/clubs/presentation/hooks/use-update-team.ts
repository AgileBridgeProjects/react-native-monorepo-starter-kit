import {
  teamDatasource,
  type UpdateTeamInput,
} from '@features/clubs/infrastructure/datasources/team-datasource';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...fields }: { id: string } & UpdateTeamInput) =>
      teamDatasource.update(id, fields),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clubs', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['teams-initial'] });
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
