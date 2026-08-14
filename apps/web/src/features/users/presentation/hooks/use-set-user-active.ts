import { useMutation } from '@tanstack/react-query';
import { patchApiUsersIdStatus } from '@/proxy/services/users/users';

export function useSetUserActive() {
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      patchApiUsersIdStatus(id, { isActive }),
  });
}
