import { useMutation } from '@tanstack/react-query';
import type { CompleteSetupRequest } from '@/proxy/models';
import { userDatasource } from '../../infrastructure/datasources/user-datasource';

export function useCompleteSetup() {
  return useMutation({
    mutationFn: (input: CompleteSetupRequest) => userDatasource.completeSetup(input),
  });
}
