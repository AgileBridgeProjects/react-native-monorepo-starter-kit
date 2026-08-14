import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAuditLog } from '@/test/factories';
import { renderHookWithProviders } from '@/test/utils/render-with-providers';

// ─── Mock datasource ──────────────────────────────────────────────────────────
vi.mock('@features/audit-log/infrastructure/datasources/audit-log-datasource', () => ({
  auditLogDatasource: { getById: vi.fn() },
}));

// ─── Mock query config (keep stable stale times in tests) ─────────────────────
vi.mock('@lib/http/query-config', () => ({
  queryCacheConfig: {
    list: { staleTime: 0, gcTime: 0 },
  },
}));

import { auditLogDatasource } from '@features/audit-log/infrastructure/datasources/audit-log-datasource';
import { useAuditLog } from '@features/audit-log/presentation/hooks/use-audit-log';

const mockGetById = vi.mocked(auditLogDatasource.getById);

describe('useAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data when the datasource resolves', async () => {
    const entry = makeAuditLog({ id: 'audit-1' });
    mockGetById.mockResolvedValue(entry);

    const { result } = renderHookWithProviders(() => useAuditLog('audit-1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('audit-1');
    expect(mockGetById).toHaveBeenCalledWith('audit-1');
  });

  it('is not enabled when id is empty', () => {
    const { result } = renderHookWithProviders(() => useAuditLog(''));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it('surfaces errors from the datasource', async () => {
    const error = new Error('Not found');
    mockGetById.mockRejectedValue(error);

    const { result } = renderHookWithProviders(() => useAuditLog('bad-id'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
