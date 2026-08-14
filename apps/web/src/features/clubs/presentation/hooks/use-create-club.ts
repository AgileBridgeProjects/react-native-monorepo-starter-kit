import {
  clubDatasource,
  clubStore,
} from '@features/clubs/infrastructure/datasources/club-datasource';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateClubRequest } from '@/proxy/models';

export function useCreateClub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateClubRequest) => clubDatasource.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clubs', 'list'] });
      // Invalidate the workspace-switcher flyout cache so the new club (with logo) appears immediately.
      void queryClient.invalidateQueries({ queryKey: ['clubs-flyout'] });
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      void clubStore.reload();
    },
  });
}
