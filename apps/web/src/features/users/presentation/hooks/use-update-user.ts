import { useMutation } from '@tanstack/react-query';
import type { UpdateUserRequest } from '@/proxy/models';
import { userDatasource } from '../../infrastructure/datasources/user-datasource';

export function useUpdateUser() {
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserRequest & { id: string }) =>
      userDatasource.update(id, input),
  });
}
