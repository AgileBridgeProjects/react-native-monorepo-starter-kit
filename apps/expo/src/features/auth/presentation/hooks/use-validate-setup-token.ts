import { queryCacheConfig } from '@lib/http/query-config';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { userSetupDatasource } from '../../infrastructure/datasources/user-setup.datasource';

export function useValidateSetupToken(token: string | undefined, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const isEnabled = (options?.enabled ?? true) && !!token;

  // Re-validate when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isEnabled) {
        queryClient.invalidateQueries({ queryKey: ['setup-token', token] });
      }
    });
    return () => subscription.remove();
  }, [token, isEnabled, queryClient]);

  return useQuery({
    queryKey: ['setup-token', token],
    queryFn: () => userSetupDatasource.validateSetupToken(token as string),
    enabled: isEnabled,
    retry: false,
    ...queryCacheConfig.session,
  });
}
