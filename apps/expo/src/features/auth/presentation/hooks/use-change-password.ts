import { useMutation } from '@tanstack/react-query';
import { userSetupDatasource } from '../../infrastructure/datasources/user-setup.datasource';

export function useChangePassword() {
  return useMutation({
    mutationFn: (newPassword: string) => userSetupDatasource.changePassword(newPassword),
  });
}
