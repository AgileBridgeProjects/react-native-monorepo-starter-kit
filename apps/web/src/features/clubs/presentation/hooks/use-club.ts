import { clubDatasource } from '@features/clubs/infrastructure/datasources/club-datasource';
import { queryCacheConfig } from '@lib/http/query-config';
import { useQuery } from '@tanstack/react-query';

const clubKeys = {
  detail: (id: string) => ['clubs', 'detail', id] as const,
};

export function useClub(id: string) {
  return useQuery({
    queryKey: clubKeys.detail(id),
    queryFn: () => clubDatasource.getById(id),
    enabled: Boolean(id),
    ...queryCacheConfig.profile,
  });
}
