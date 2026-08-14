// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

import { customInstance } from '../../../lib/http/orval-mutator';
import type { AuditLogListResponse, AuditLogResponse, GetApiAuditLogsParams } from '../../models';

export const getApiAuditLogs = (params?: GetApiAuditLogsParams) => {
  return customInstance<AuditLogListResponse>({ url: `/api/audit-logs`, method: 'GET', params });
};
export const getApiAuditLogsId = (id: string) => {
  return customInstance<AuditLogResponse>({ url: `/api/audit-logs/${id}`, method: 'GET' });
};
export const getApiAuditLogsEntityNames = () => {
  return customInstance<string[]>({ url: `/api/audit-logs/entity-names`, method: 'GET' });
};
export type GetApiAuditLogsResult = NonNullable<Awaited<ReturnType<typeof getApiAuditLogs>>>;
export type GetApiAuditLogsIdResult = NonNullable<Awaited<ReturnType<typeof getApiAuditLogsId>>>;
export type GetApiAuditLogsEntityNamesResult = NonNullable<
  Awaited<ReturnType<typeof getApiAuditLogsEntityNames>>
>;
