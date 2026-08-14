import {
  type CreateTeamInput,
  teamDatasource,
} from '@features/clubs/infrastructure/datasources/team-datasource';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeamInput) => teamDatasource.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clubs', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['teams-initial'] });
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
