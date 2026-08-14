'use client';

import type { AuditLogActiveFilters } from '@features/audit-log/infrastructure/datasources/audit-log-datasource';
import {
  useAuditLogEntityNames,
  useAuditLogUsers,
} from '@features/audit-log/presentation/hooks/use-audit-log';
import { useTranslation } from '@lib/i18n';
import SelectBox from 'devextreme-react/select-box';
import { DateRangeBox, FormField, GridFilterMenu, GridSearchBox } from '@/components/ui';
import { AuditAction } from '@/proxy/models';
import type { LabelledOption } from '@/types/select-option';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogGridToolbarProps {
  searchText: string;
  onSearchTextChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  filters: AuditLogActiveFilters;
  onFiltersChange: (filters: AuditLogActiveFilters) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditLogGridToolbar({
  searchText,
  onSearchTextChange,
  onSearchSubmit,
  filters,
  onFiltersChange,
}: AuditLogGridToolbarProps) {
  const { t } = useTranslation('audit-log');

  const { data: entityNames = [] } = useAuditLogEntityNames();
  const { data: users = [] as { id: string; name: string }[] } = useAuditLogUsers();

  const entityOptions: LabelledOption<string | undefined>[] = [
    { label: t('filters.allEntities'), value: undefined },
    ...entityNames.map((name) => ({ label: name, value: name })),
  ];

  const actionOptions: LabelledOption<AuditAction | undefined>[] = [
    { label: t('filters.allActions'), value: undefined },
    { label: t('actions.insert'), value: AuditAction.Insert },
    { label: t('actions.update'), value: AuditAction.Update },
    { label: t('actions.delete'), value: AuditAction.Delete },
  ];

  const userOptions: LabelledOption<string | undefined>[] = [
    { label: t('filters.allUsers'), value: undefined },
    ...users.map((u) => ({ label: u.name, value: u.id })),
  ];

  const activeFilterCount =
    (filters.entityName ? 1 : 0) +
    (filters.action ? 1 : 0) +
    (filters.userId ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0);

  return (
    <div className="flex items-center gap-sm border-b border-border px-md py-sm">
      <div className="flex-1">
        <GridSearchBox
          value={searchText}
          onValueChange={onSearchTextChange}
          onSearch={onSearchSubmit}
        />
      </div>

      <GridFilterMenu activeCount={activeFilterCount} onClearAll={() => onFiltersChange({})}>
        <FormField label={t('filters.entityType')} htmlFor="audit-filter-entity">
          <SelectBox
            dataSource={entityOptions}
            displayExpr="label"
            valueExpr="value"
            value={filters.entityName}
            onValueChange={(value) => onFiltersChange({ ...filters, entityName: value })}
            stylingMode="outlined"
            placeholder={t('filters.allEntities')}
            showClearButton
            width="100%"
            inputAttr={{ id: 'audit-filter-entity' }}
          />
        </FormField>

        <FormField label={t('filters.action')} htmlFor="audit-filter-action">
          <SelectBox
            dataSource={actionOptions}
            displayExpr="label"
            valueExpr="value"
            value={filters.action}
            onValueChange={(value) => onFiltersChange({ ...filters, action: value })}
            stylingMode="outlined"
            placeholder={t('filters.allActions')}
            showClearButton
            width="100%"
            inputAttr={{ id: 'audit-filter-action' }}
          />
        </FormField>

        <FormField label={t('filters.user')} htmlFor="audit-filter-user">
          <SelectBox
            dataSource={userOptions}
            displayExpr="label"
            valueExpr="value"
            value={filters.userId}
            onValueChange={(value) => onFiltersChange({ ...filters, userId: value })}
            stylingMode="outlined"
            placeholder={t('filters.allUsers')}
            showClearButton
            searchEnabled
            width="100%"
            inputAttr={{ id: 'audit-filter-user' }}
          />
        </FormField>

        <FormField label={t('filters.dateRange')} htmlFor="audit-log-date-range">
          <DateRangeBox
            id="audit-log-date-range"
            startDate={filters.from}
            endDate={filters.to}
            startDateLabel={t('filters.dateFrom')}
            endDateLabel={t('filters.dateTo')}
            onChange={({ startDate, endDate }) =>
              onFiltersChange({
                ...filters,
                from: startDate ?? undefined,
                to: endDate ?? undefined,
              })
            }
          />
        </FormField>
      </GridFilterMenu>
    </div>
  );
}
