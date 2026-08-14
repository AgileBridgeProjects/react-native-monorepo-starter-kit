'use client';

import type { AuditLogActiveFilters } from '@features/audit-log/infrastructure/datasources/audit-log-datasource';
import { auditLogStore } from '@features/audit-log/infrastructure/datasources/audit-log-datasource';
import { AuditLogDiff } from '@features/audit-log/presentation/components/audit-log-diff';
import { AuditLogGridToolbar } from '@features/audit-log/presentation/components/audit-log-grid-toolbar';
import { useAuditLog } from '@features/audit-log/presentation/hooks/use-audit-log';
import { copyToClipboard } from '@lib/browser-utils';
import { formatAdminDate, formatAdminTime, useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { CheckIcon, CopyIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { Column, Pager, Paging } from 'devextreme-react/data-grid';
import { useEffect, useState } from 'react';
import {
  ActionMenu,
  Button,
  DrawerPanel,
  notify,
  PageHeader,
  Skeleton,
  StandardDataGrid,
  Typography,
} from '@/components/ui';
import type { AuditLogResponse } from '@/proxy/models';
import { AuditAction } from '@/proxy/models';
import { AuditActionBadge } from '../components/audit-action-badge';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUserId(userId: string | null | undefined): string {
  if (!userId) return '-';
  return `${userId.slice(0, 8)}…`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AuditLogsPage() {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedEntryPreview, setSelectedEntryPreview] = useState<AuditLogResponse | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState<AuditLogActiveFilters>({});
  const [idCopied, setIdCopied] = useState(false);
  const { t } = useTranslation('audit-log');

  const {
    data: selectedEntry,
    isLoading: isSelectedEntryLoading,
    isError: isSelectedEntryError,
  } = useAuditLog(selectedEntryId ?? '');

  useEffect(() => {
    if (!selectedEntryId || !isSelectedEntryError) return;
    notify(t('common:grid.loadError'), 'error', uiConfig.toast.errorDurationMs);
    setSelectedEntryId(null);
    setSelectedEntryPreview(null);
  }, [isSelectedEntryError, selectedEntryId, t]);

  function handleView(entry: AuditLogResponse) {
    if (!entry.id) {
      notify(t('common:grid.loadError'), 'error', uiConfig.toast.errorDurationMs);
      return;
    }
    setSelectedEntryPreview(entry);
    setSelectedEntryId(entry.id);
  }

  function handleClose() {
    setSelectedEntryId(null);
    setSelectedEntryPreview(null);
    setIdCopied(false);
  }

  function handleFiltersChange(filters: AuditLogActiveFilters) {
    setActiveFilters(filters);
    auditLogStore.setFilters(filters);
  }

  const popupEntry = selectedEntry ?? selectedEntryPreview;
  const copyIdIcon = idCopied ? (
    <CheckIcon size={iconSize.xs} className="text-success" />
  ) : (
    <CopyIcon size={iconSize.xs} />
  );

  return (
    <div data-testid="audit-logs-page">
      <PageHeader title={t('audit-log:page.title')} />

      <div className="overflow-hidden rounded-lg border border-border bg-surface-elevated">
        <AuditLogGridToolbar
          searchText={searchText}
          onSearchTextChange={setSearchText}
          onSearchSubmit={(v) => {
            if (typeof auditLogStore.setSearch === 'function') {
              auditLogStore.setSearch(v || undefined);
            }
          }}
          filters={activeFilters}
          onFiltersChange={handleFiltersChange}
        />

        <StandardDataGrid<AuditLogResponse>
          dataSource={auditLogStore}
          keyExpr="id"
          skeletonColumnCount={4}
          skeletonActionCount={1}
          skeletonShowPager
          noDataText={t('common:grid.noRecords')}
          remoteOperations={{ paging: true, filtering: true, sorting: true }}
          onDataErrorOccurred={() =>
            notify(t('common:grid.loadError'), 'error', uiConfig.toast.errorDurationMs)
          }
        >
          <Paging defaultPageSize={uiConfig.grid.defaultPageSize} />
          <Pager
            showPageSizeSelector
            allowedPageSizes={uiConfig.grid.allowedPageSizes}
            showInfo
            showNavigationButtons
          />

          <Column
            dataField="timestamp"
            caption={t('audit-log:columns.timestamp')}
            dataType="datetime"
            sortOrder="desc"
            customizeText={({ value }: { value: unknown }) =>
              value
                ? `${formatAdminDate(value as string)} ${formatAdminTime(value as string)}`
                : '-'
            }
          />

          <Column dataField="entityName" caption={t('audit-log:columns.entity')} />

          <Column
            dataField="action"
            caption={t('audit-log:columns.action')}
            cellRender={({ data }: { data: AuditLogResponse }) => (
              <AuditActionBadge action={data.action ?? AuditAction.Update} />
            )}
          />

          <Column
            dataField="userName"
            caption={t('audit-log:columns.user')}
            allowSorting={false}
            cellRender={({ data }: { data: AuditLogResponse }) => (
              <span title={data.userId ?? undefined}>
                {data.userName ?? formatUserId(data.userId)}
              </span>
            )}
          />

          <Column
            caption=""
            width={52}
            allowSorting={false}
            allowFiltering={false}
            fixed={true}
            fixedPosition="right"
            cssClass="actions-col"
            cellRender={({ data }: { data: AuditLogResponse }) => (
              <ActionMenu
                aria-label={t('common:grid.actions')}
                items={[
                  {
                    label: t('common:grid.view'),
                    onClick: () => handleView(data),
                  },
                ]}
              />
            )}
          />
        </StandardDataGrid>
      </div>

      <DrawerPanel
        visible={selectedEntryId !== null}
        onHide={handleClose}
        title={popupEntry?.entityName ?? ''}
        subtitle={
          popupEntry?.timestamp
            ? `${formatAdminDate(popupEntry.timestamp)} ${formatAdminTime(popupEntry.timestamp)}`
            : undefined
        }
        badge={
          popupEntry ? (
            <AuditActionBadge action={popupEntry.action ?? AuditAction.Update} />
          ) : undefined
        }
        size="xl"
        data-testid="audit-log-drawer"
      >
        {isSelectedEntryLoading && !selectedEntry && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-5 w-48" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="col-span-2 h-10 w-full" />
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {selectedEntry && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border bg-surface p-3">
              <div className="flex flex-col gap-0.5">
                <Typography
                  variant="caption"
                  className="font-semibold uppercase tracking-wide text-text-secondary"
                >
                  {t('audit-log:detail.user')}
                </Typography>
                <Typography variant="body-sm" title={selectedEntry.userId ?? undefined}>
                  {selectedEntry.userName ??
                    selectedEntry.userId ??
                    t('audit-log:detail.systemUser')}
                </Typography>
              </div>
              <div className="flex flex-col gap-0.5">
                <Typography
                  variant="caption"
                  className="font-semibold uppercase tracking-wide text-text-secondary"
                >
                  {t('audit-log:detail.id')}
                </Typography>
                <div className="flex items-center gap-1.5">
                  <Typography variant="caption" className="break-all font-mono text-text-secondary">
                    {selectedEntry.entityId}
                  </Typography>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await copyToClipboard(selectedEntry.entityId ?? '');
                      setIdCopied(true);
                      setTimeout(() => setIdCopied(false), 2000);
                    }}
                    className="shrink-0 p-0.5 text-text-muted hover:text-text"
                    aria-label={t('audit-log:detail.copyId')}
                  >
                    {copyIdIcon}
                  </Button>
                </div>
              </div>
            </div>

            <AuditLogDiff
              action={selectedEntry.action ?? AuditAction.Update}
              oldValues={selectedEntry.oldValues}
              newValues={selectedEntry.newValues}
            />
          </div>
        )}

        {!isSelectedEntryLoading && !selectedEntry && popupEntry && (
          <Typography variant="body-sm">{t('common:grid.loadError')}</Typography>
        )}
      </DrawerPanel>
    </div>
  );
}
