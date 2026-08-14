import { useMutation } from '@tanstack/react-query';
import { userSetupDatasource } from '../../infrastructure/datasources/user-setup.datasource';

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => userSetupDatasource.requestPasswordReset(email),
  });
}
