import { useMutation } from '@tanstack/react-query';
import type { CompleteSetupRequest } from '@/src/proxy/models';
import { userSetupDatasource } from '../../infrastructure/datasources/user-setup.datasource';

export function useCompleteSetup() {
  return useMutation({
    mutationFn: (input: CompleteSetupRequest) => userSetupDatasource.completeSetup(input),
  });
}
