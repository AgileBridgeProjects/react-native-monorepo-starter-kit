'use client';

import type { User } from '@features/users/domain/entities/user';
import { UserGridRowActions } from '@features/users/presentation/components/user-grid-row-actions';
import { UserGridToolbar } from '@features/users/presentation/components/user-grid-toolbar';
import { useRoles } from '@features/users/presentation/hooks/use-roles';
import { useUserGridRows } from '@features/users/presentation/hooks/use-user-grid-rows';
import { getAuthMethodPresentation } from '@features/users/presentation/utils/auth-method-presentation';
import { getSetupStatusBadge } from '@features/users/presentation/utils/setup-status-badge';
import { formatRoleLabel, getIdentifier } from '@features/users/presentation/utils/user-display';
import type { GridStore } from '@lib/http/create-grid-store';
import { useTranslation } from '@lib/i18n';
import { UsersIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import { Column } from 'devextreme-react/data-grid';
import { useImperativeHandle, useMemo, useState } from 'react';
import {
  Avatar,
  type EntityDataGridHandle,
  GridCheckbox,
  StandardDataGrid,
  StatusBadge,
  Typography,
} from '@/components/ui';
import { AuthenticationMethod, SetupStatus } from '@/proxy/models';
import type { LabelledOption } from '@/types/select-option';
import { UserAvatarPreviewModal } from './user-avatar-preview-modal';

interface UserGridProps {
  store: GridStore<User>;
  hasClubSelected: boolean;
  onSelectionChanged: (ids: string[]) => void;
  selectedKeys: string[];
  statusFilter: boolean | undefined;
  onStatusFilterChange: (value: boolean | undefined) => void;
  roleFilter: string | undefined;
  onRoleFilterChange: (value: string | undefined) => void;
  setupStatusFilter: SetupStatus | undefined;
  onSetupStatusFilterChange: (value: SetupStatus | undefined) => void;
  gridRef?: React.Ref<EntityDataGridHandle>;
  onEditUser: (user: User) => void;
  onViewDetails: (user: User) => void;
  onResendSetupLink: (user: User) => void;
  onDisableUser: (user: User) => void;
  onChangePassword: (user: User) => void;
  isCurrentUser: (user: User) => boolean;
  canManage: boolean;
  resendingUserId: string | null;
  deptNameMap: Map<string, string>;
  onBulkEnable: () => void;
  onBulkDisable: () => void;
  onBulkToggle: () => void;
  isBulkPending?: boolean;
  disablingUserId?: string | null;
  onClearSelection: () => void;
  onAvatarDeleted?: () => void;
}

export function UserGrid({
  store,
  hasClubSelected,
  onSelectionChanged,
  selectedKeys,
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
  setupStatusFilter,
  onSetupStatusFilterChange,
  gridRef,
  onEditUser,
  onViewDetails,
  onResendSetupLink,
  onDisableUser,
  onChangePassword,
  isCurrentUser,
  canManage,
  resendingUserId,
  deptNameMap,
  onBulkEnable,
  onBulkDisable,
  onBulkToggle,
  isBulkPending,
  disablingUserId,
  onClearSelection,
  onAvatarDeleted,
}: UserGridProps) {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [previewUser, setPreviewUser] = useState<User | null>(null);

  const { rows, isLoading } = useUserGridRows(store);
  const { data: roles = [] } = useRoles();

  const selectedRowMap = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  useImperativeHandle(gridRef, () => ({
    clearSelection() {
      onSelectionChanged([]);
    },
    getSelectedRowsData() {
      return selectedKeys.map((id) => selectedRowMap.get(id)).filter((u): u is User => Boolean(u));
    },
    getAllRows() {
      return rows;
    },
  }));

  const statusOptions = useMemo<LabelledOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: t('users:filter.allStatuses') },
      { value: true, label: t('users:status.active') },
      { value: false, label: t('users:status.inactive') },
    ],
    [t],
  );

  const roleOptions = useMemo<LabelledOption<string | undefined>[]>(
    () => [
      { value: undefined, label: t('users:filter.allRoles') },
      ...roles
        .filter((r) => r.isActive)
        .map((r) => ({ value: r.name, label: formatRoleLabel(r.name) })),
    ],
    [roles, t],
  );

  const setupStatusOptions = useMemo<LabelledOption<SetupStatus | undefined>[]>(
    () => [
      { value: undefined, label: t('users:filter.allSetupStatuses') },
      { value: SetupStatus.PendingSetup, label: t('users:setupStatus.pendingSetup') },
      { value: SetupStatus.SetupExpired, label: t('users:setupStatus.setupExpired') },
    ],
    [t],
  );

  const activeFilterCount =
    (statusFilter !== undefined ? 1 : 0) +
    (roleFilter ? 1 : 0) +
    (setupStatusFilter !== undefined ? 1 : 0);

  function handleClearFilters() {
    onStatusFilterChange(undefined);
    onRoleFilterChange(undefined);
    onSetupStatusFilterChange(undefined);
  }

  const displayRows = rows;

  const allSelected =
    displayRows.length > 0 && displayRows.every((u) => selectedKeys.includes(u.id));
  const someSelected = !allSelected && displayRows.some((u) => selectedKeys.includes(u.id));

  function handleSelectAll(checked: boolean) {
    onSelectionChanged(checked ? displayRows.map((u) => u.id) : []);
  }

  function handleToggleRow(id: string, checked: boolean) {
    onSelectionChanged(checked ? [...selectedKeys, id] : selectedKeys.filter((k) => k !== id));
  }

  // Show both Enable and Disable whenever users are selected. With server-side paging the
  // selected set may span multiple pages, so we can't cheaply inspect every selected user's
  // active state; showing both actions is safe — the handlers skip users that don't need it.
  const showEnable = selectedKeys.length > 0;
  const showDisable = selectedKeys.length > 0;

  function triggerSearch(value: string) {
    if (typeof store?.setSearch === 'function') store.setSearch(value || undefined);
  }

  if (!hasClubSelected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <Typography variant="body" className="sr-only">
          {t('users:emptyState.selectClubLabel')}
        </Typography>
        <UsersIcon className="mb-3 text-text-muted" size={iconSize.lg} />
        <Typography variant="body" className="font-medium text-text">
          {t('users:emptyState.selectClub')}
        </Typography>
        <Typography variant="body-sm" className="mt-1 text-text-muted">
          {t('users:emptyState.selectClubHint')}
        </Typography>
      </div>
    );
  }

  return (
    <div className="overflow-clip rounded-lg border border-border bg-surface-elevated">
      <div className={cn('dx-grid-select-hover', selectedKeys.length > 0 && 'has-selection')}>
        <UserGridToolbar
          searchText={searchText}
          onSearchTextChange={setSearchText}
          onSearchSubmit={triggerSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          statusOptions={statusOptions}
          roleFilter={roleFilter}
          onRoleFilterChange={onRoleFilterChange}
          roleOptions={roleOptions}
          setupStatusFilter={setupStatusFilter}
          onSetupStatusFilterChange={onSetupStatusFilterChange}
          setupStatusOptions={setupStatusOptions}
          activeFilterCount={activeFilterCount}
          onClearFilters={handleClearFilters}
          selectedCount={selectedKeys.length}
          showEnable={showEnable}
          showDisable={showDisable}
          onBulkEnable={onBulkEnable}
          onBulkDisable={onBulkDisable}
          onBulkToggle={onBulkToggle}
          isBulkPending={isBulkPending}
          onClearSelection={onClearSelection}
        />

        <StandardDataGrid<User>
          dataSource={displayRows}
          keyExpr="id"
          isLoading={isLoading}
          skeletonColumnCount={6}
          skeletonActionCount={1}
          noDataText={t('common:grid.noRecords')}
          elementAttr={{ 'data-testid': 'users-grid' } as object}
        >
          {/* Checkbox column */}
          <Column
            caption=""
            width={44}
            allowSorting={false}
            headerCellRender={() => (
              // biome-ignore lint/a11y/noLabelWithoutControl: label wraps GridCheckbox which renders <input type="checkbox">
              <label className="flex items-center justify-center">
                <GridCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  aria-label={t('common:actions.selectAll')}
                />
              </label>
            )}
            cellRender={({ data }: { data: User }) => (
              // biome-ignore lint/a11y/noLabelWithoutControl: label wraps GridCheckbox which renders <input type="checkbox">
              // biome-ignore lint/a11y/useKeyWithClickEvents: label wraps input; click on label toggles checkbox
              <label
                className="flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <GridCheckbox
                  checked={selectedKeys.includes(data.id)}
                  onChange={(e) => handleToggleRow(data.id, e.target.checked)}
                  aria-label={t('common:actions.selectRow', { name: data.displayName })}
                />
              </label>
            )}
          />

          {/* Name + identifier */}
          <Column
            caption={t('users:columns.displayName')}
            allowSorting={true}
            defaultSortOrder="asc"
            calculateSortValue={(data: User) => data.displayName.toLowerCase()}
            minWidth={180}
            cellRender={({ data }: { data: User }) => {
              const identifier = getIdentifier(data);
              return (
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar
                    name={data.displayName}
                    avatarUrl={data.avatarUrl}
                    onExpand={data.avatarUrl ? () => setPreviewUser(data) : undefined}
                  />
                  <div className="flex min-w-0 flex-col">
                    <div className="flex min-w-0 items-center gap-2">
                      <Typography variant="body-sm" as="span" className="truncate font-medium">
                        {data.displayName}
                      </Typography>
                      {isCurrentUser(data) && (
                        <StatusBadge label={t('users:indicator.you')} variant="primary" />
                      )}
                    </div>
                    <Typography variant="caption" as="span" className="truncate">
                      {identifier}
                    </Typography>
                  </div>
                </div>
              );
            }}
          />

          {/* Login Method */}
          <Column
            caption={t('users:columns.loginBadge')}
            allowSorting={true}
            calculateSortValue={(data: User) =>
              getAuthMethodPresentation(data.authMethod, t).label.toLowerCase()
            }
            minWidth={140}
            cellRender={({ data }: { data: User }) => {
              const method = getAuthMethodPresentation(data.authMethod, t);
              const isEmailPassword = data.authMethod === AuthenticationMethod.Credentials;
              const verificationBadge = getSetupStatusBadge(data.setupStatus, t);
              return (
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex shrink-0">{method.icon}</span>
                  <Typography variant="body-sm" as="span" className="truncate">
                    {method.label}
                  </Typography>
                  {isEmailPassword && verificationBadge}
                </div>
              );
            }}
          />

          {/* Role */}
          <Column
            caption={t('users:columns.role')}
            allowSorting={true}
            calculateSortValue={(data: User) => formatRoleLabel(data.roles[0]).toLowerCase()}
            minWidth={120}
            cellRender={({ data }: { data: User }) => (
              <Typography variant="body-sm" as="div" className="truncate">
                {formatRoleLabel(data.roles[0])}
              </Typography>
            )}
          />

          {/* Team */}
          <Column
            caption={t('users:columns.team')}
            allowSorting={true}
            calculateSortValue={(data: User) =>
              data.teamIds[0] ? (deptNameMap.get(data.teamIds[0]) ?? '').toLowerCase() : ''
            }
            minWidth={120}
            cellRender={({ data }: { data: User }) => (
              <Typography variant="body-sm" as="div" className="truncate">
                {data.teamIds[0] ? (deptNameMap.get(data.teamIds[0]) ?? data.teamIds[0]) : '-'}
              </Typography>
            )}
          />

          {/* Status */}
          <Column
            caption={t('users:columns.status')}
            allowSorting={true}
            calculateSortValue={(data: User) => (data.isActive ? 1 : 0)}
            minWidth={110}
            alignment="center"
            cellRender={({ data }: { data: User }) => (
              <StatusBadge
                label={data.isActive ? t('users:status.active') : t('users:status.inactive')}
                variant={data.isActive ? 'success' : 'error'}
              />
            )}
          />

          {/* Actions */}
          <Column
            caption=""
            width={52}
            allowSorting={false}
            fixed={true}
            fixedPosition="right"
            cssClass="actions-col"
            cellRender={({ data }: { data: User }) => (
              <UserGridRowActions
                user={data}
                canManage={canManage}
                resendingUserId={resendingUserId}
                disablingUserId={disablingUserId ?? null}
                isCurrentUser={isCurrentUser(data)}
                onEditUser={onEditUser}
                onViewDetails={onViewDetails}
                onResendSetupLink={onResendSetupLink}
                onDisableUser={onDisableUser}
                onChangePassword={onChangePassword}
              />
            )}
          />
        </StandardDataGrid>
      </div>

      <UserAvatarPreviewModal
        user={previewUser}
        canManage={canManage}
        onHide={() => setPreviewUser(null)}
        onAvatarDeleted={onAvatarDeleted}
      />
    </div>
  );
}
