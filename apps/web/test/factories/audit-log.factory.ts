import type { AuditLogResponse } from '@features/audit-log/infrastructure/datasources/audit-log-datasource';
import { AuditAction } from '@/proxy/models';

export function makeAuditLog(overrides: Partial<AuditLogResponse> = {}): AuditLogResponse {
  return {
    id: 'audit-1',
    entityName: 'Club',
    entityId: 'club-1',
    action: AuditAction.Insert,
    oldValues: null,
    newValues: '{"name":"Acme Corp"}',
    userId: 'user-1',
    timestamp: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}
