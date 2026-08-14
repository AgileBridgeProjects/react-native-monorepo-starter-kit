import { useMutation } from '@tanstack/react-query';
import type { AdminCreateUserRequest } from '@/proxy/models';
import { userDatasource } from '../../infrastructure/datasources/user-datasource';

export function useCreateUser() {
  return useMutation({
    mutationFn: (input: AdminCreateUserRequest) => userDatasource.create(input),
  });
}
