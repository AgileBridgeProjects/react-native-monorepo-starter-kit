import { userDatasource } from '@features/users/infrastructure/datasources/user-datasource';
import { useMutation } from '@tanstack/react-query';

export function useRemoveAvatar() {
  return useMutation({
    mutationFn: (id: string) => userDatasource.removeAvatar(id),
  });
}
