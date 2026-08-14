import { useMutation } from '@tanstack/react-query';
import { userDatasource } from '../../infrastructure/datasources/user-datasource';

export function useDeleteUser() {
  return useMutation({
    mutationFn: (id: string) => userDatasource.remove(id),
  });
}
