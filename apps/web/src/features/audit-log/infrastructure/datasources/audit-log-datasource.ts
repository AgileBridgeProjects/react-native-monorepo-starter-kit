import { AuditLogNotFoundFailure } from '@features/audit-log/domain/failures/audit-log-failures';
import type { GridSortItem, GridStore } from '@lib/http/create-grid-store';
import CustomStore from 'devextreme/data/custom_store';
import DataSource from 'devextreme/data/data_source';
import type {
  AuditAction,
  AuditLogListResponse,
  AuditLogResponse,
  GetApiAuditLogsParams,
} from '@/proxy/models';
import {
  getApiAuditLogs,
  getApiAuditLogsEntityNames,
  getApiAuditLogsId,
} from '@/proxy/services/audit-logs/audit-logs';

export type { AuditLogListResponse, AuditLogResponse, GetApiAuditLogsParams };

// ─── Active filter state ───────────────────────────────────────────────────────

export interface AuditLogActiveFilters {
  entityName?: string;
  action?: AuditAction;
  userId?: string;
  from?: string;
  to?: string;
}

// ─── Grid store ───────────────────────────────────────────────────────────────

export interface AuditLogGridStore extends GridStore<AuditLogResponse> {
  setFilters(filters: AuditLogActiveFilters): void;
}

export const auditLogDatasource = {
  async list(params?: GetApiAuditLogsParams): Promise<AuditLogListResponse> {
    return getApiAuditLogs(params);
  },

  async getById(id: string): Promise<AuditLogResponse> {
    const result = await getApiAuditLogsId(id);
    if (!result) throw new AuditLogNotFoundFailure(id);
    return result;
  },

  async getEntityNames(): Promise<string[]> {
    const result = await getApiAuditLogsEntityNames();
    return result ?? [];
  },
};

function createAuditLogStore(): AuditLogGridStore {
  let filterText: string | undefined;
  let activeFilters: AuditLogActiveFilters = {};

  const customStore = new CustomStore<AuditLogResponse>({
    key: 'id',
    async load(loadOptions) {
      const take = loadOptions.take as number;
      const skip = loadOptions.skip ?? 0;
      const page = Math.floor(skip / take) + 1;
      const sort = Array.isArray(loadOptions.sort)
        ? (loadOptions.sort as GridSortItem[])
        : undefined;
      const primarySort = sort?.[0];

      const response = await auditLogDatasource.list({
        Page: page,
        PageSize: take,
        FilterText: filterText,
        SortBy: primarySort?.selector,
        SortDescending: primarySort !== undefined ? primarySort.desc : true,
        EntityName: activeFilters.entityName,
        Action: activeFilters.action,
        UserId: activeFilters.userId,
        From: activeFilters.from,
        To: activeFilters.to,
      });

      return {
        data: response.items ?? [],
        totalCount: Number(response.totalCount ?? 0),
      };
    },
  });

  const dataSource = new DataSource<AuditLogResponse>({
    store: customStore,
    requireTotalCount: true,
    pageSize: 50,
  }) as AuditLogGridStore;

  dataSource.setSearch = (text: string | undefined) => {
    filterText = text || undefined;
    void dataSource.reload();
  };

  dataSource.setFilters = (filters: AuditLogActiveFilters) => {
    activeFilters = filters;
    void dataSource.reload();
  };

  return dataSource;
}

export const auditLogStore = createAuditLogStore();
