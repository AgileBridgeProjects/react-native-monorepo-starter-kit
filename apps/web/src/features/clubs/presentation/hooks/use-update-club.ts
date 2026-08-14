import {
  clubDatasource,
  clubStore,
} from '@features/clubs/infrastructure/datasources/club-datasource';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateClubRequest } from '@/proxy/models';
import { useWorkspaceStore } from '@/store/workspace-store';

export function useUpdateClub() {
  const queryClient = useQueryClient();
  const { clubId, clubName, setClub } = useWorkspaceStore();

  return useMutation({
    mutationFn: ({ id, ...fields }: { id: string } & UpdateClubRequest) =>
      clubDatasource.update(id, fields),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['clubs', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['clubs', 'detail', variables.id] });
      // Invalidate the workspace-switcher flyout cache so the updated logo appears immediately.
      void queryClient.invalidateQueries({ queryKey: ['clubs-flyout'] });
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      void clubStore.reload();
      // If the updated club is the currently-selected workspace club, sync the logo URL
      // so the sidebar avatar updates without requiring a page refresh.
      if (variables.id === clubId) {
        setClub({
          id: variables.id,
          name: variables.name ?? clubName ?? '',
          logoUrl: data.logoUrl ?? null,
        });
      }
    },
  });
}
