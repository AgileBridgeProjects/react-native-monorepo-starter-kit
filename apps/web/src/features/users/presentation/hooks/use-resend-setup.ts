import { useMutation } from '@tanstack/react-query';
import { userDatasource } from '../../infrastructure/datasources/user-datasource';

export function useResendSetup() {
  return useMutation({
    mutationFn: (userId: string) => userDatasource.resendSetup(userId),
  });
}
