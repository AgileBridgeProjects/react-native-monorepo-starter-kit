import { auditLogDatasource } from '@features/audit-log/infrastructure/datasources/audit-log-datasource';
import { queryCacheConfig } from '@lib/http/query-config';
import { useQuery } from '@tanstack/react-query';
import type { UserListResponse } from '@/proxy/models';
import { getApiUsers } from '@/proxy/services/users/users';

const auditLogKeys = {
  detail: (id: string) => ['audit-logs', 'detail', id] as const,
  entityNames: ['audit-logs', 'entity-names'] as const,
  users: ['audit-logs', 'users'] as const,
};

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: auditLogKeys.detail(id),
    queryFn: () => auditLogDatasource.getById(id),
    enabled: Boolean(id),
    ...queryCacheConfig.list,
  });
}

export function useAuditLogEntityNames() {
  return useQuery({
    queryKey: auditLogKeys.entityNames,
    queryFn: () => auditLogDatasource.getEntityNames(),
    ...queryCacheConfig.static,
  });
}

export function useAuditLogUsers() {
  return useQuery({
    queryKey: auditLogKeys.users,
    queryFn: (): Promise<UserListResponse> => getApiUsers({ PageSize: 500, IsActive: true }),
    select: (data: UserListResponse) =>
      (data.items ?? [])
        .filter((u) => u.id && u.displayName)
        .map((u) => ({ id: u.id as string, name: u.displayName as string })),
    ...queryCacheConfig.profile,
  });
}
