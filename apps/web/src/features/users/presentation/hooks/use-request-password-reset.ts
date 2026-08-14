import { useMutation } from '@tanstack/react-query';
import { userDatasource } from '../../infrastructure/datasources/user-datasource';

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => userDatasource.requestPasswordReset(email),
  });
}
