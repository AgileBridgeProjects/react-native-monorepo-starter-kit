import { AuditLogNotFoundFailure } from '@features/audit-log/domain/failures/audit-log-failures';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAuditLog } from '@/test/factories';

// ─── Mock proxy functions ─────────────────────────────────────────────────────
vi.mock('@/proxy/services/audit-logs/audit-logs', () => ({
  getApiAuditLogs: vi.fn(),
  getApiAuditLogsId: vi.fn(),
}));

// ─── Mock DevExtreme grid store ───────────────────────────────────────────────
vi.mock('@lib/http/create-grid-store', () => ({
  createGridStore: vi.fn(() => ({ reload: vi.fn() })),
}));

import { auditLogDatasource } from '@features/audit-log/infrastructure/datasources/audit-log-datasource';
import { getApiAuditLogs, getApiAuditLogsId } from '@/proxy/services/audit-logs/audit-logs';

const mockGetApiAuditLogs = vi.mocked(getApiAuditLogs);
const mockGetApiAuditLogsId = vi.mocked(getApiAuditLogsId);

describe('auditLogDatasource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns the response from the proxy unchanged', async () => {
      const response = { items: [makeAuditLog()], totalCount: 1 };
      mockGetApiAuditLogs.mockResolvedValue(response as never);

      const result = await auditLogDatasource.list({ Page: 1, PageSize: 25 });

      expect(result).toBe(response);
      expect(mockGetApiAuditLogs).toHaveBeenCalledWith({ Page: 1, PageSize: 25 });
    });

    it('passes undefined params when called without arguments', async () => {
      mockGetApiAuditLogs.mockResolvedValue({ items: [], totalCount: 0 } as never);

      await auditLogDatasource.list();

      expect(mockGetApiAuditLogs).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getById', () => {
    it('returns the audit log entry on success', async () => {
      const entry = makeAuditLog({ id: 'audit-42' });
      mockGetApiAuditLogsId.mockResolvedValue(entry as never);

      const result = await auditLogDatasource.getById('audit-42');

      expect(result.id).toBe('audit-42');
    });

    it('throws AuditLogNotFoundFailure when result is null/undefined', async () => {
      mockGetApiAuditLogsId.mockResolvedValue(null as never);

      await expect(auditLogDatasource.getById('missing')).rejects.toBeInstanceOf(
        AuditLogNotFoundFailure,
      );
    });

    it('includes the id in the AuditLogNotFoundFailure message', async () => {
      mockGetApiAuditLogsId.mockResolvedValue(null as never);

      await expect(auditLogDatasource.getById('audit-999')).rejects.toMatchObject({
        message: expect.stringContaining('audit-999'),
      });
    });
  });
});
