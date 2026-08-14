'use client';

import { useClubOptions } from '@features/clubs/presentation/hooks/use-club-options';
import type { Role } from '@features/roles/domain/entities/role';
import { RoleDeactivateModal } from '@features/roles/presentation/components/role-deactivate-modal';
import { RoleDrawer } from '@features/roles/presentation/components/role-drawer';
import { RoleGridRowActions } from '@features/roles/presentation/components/role-grid-row-actions';
import { RolePermissionsEditor } from '@features/roles/presentation/components/role-permissions-editor';
import { useActivateRole } from '@features/roles/presentation/hooks/use-activate-role';
import { useDeactivateRole } from '@features/roles/presentation/hooks/use-deactivate-role';
import { useRoleAssignments } from '@features/roles/presentation/hooks/use-role-assignments';
import { useRoles } from '@features/roles/presentation/hooks/use-roles';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { useQueryClient } from '@tanstack/react-query';
import { AddIcon } from '@starterkit/icons';
import { confirm } from 'devextreme/ui/dialog';
import { Column, Pager, Paging } from 'devextreme-react/data-grid';
import { useState } from 'react';
import {
  Button as AppButton,
  PageHeader,
  StandardDataGrid,
  StatusBadge,
  toast,
} from '@/components/ui';
import { Typography } from '@/components/ui/typography';
import { useCurrentSession } from '@/features/auth/presentation/hooks/use-current-session';

export function RolesView() {
  const { t } = useTranslation();
  const { hasPermission } = useCurrentSession();
  const canManage = hasPermission('StarterKit.Roles.Manage');

  const queryClient = useQueryClient();
  const { data: roles = [], isLoading } = useRoles({ includeInactive: true });
  const { data: clubs = [] } = useClubOptions();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissionsRole, setPermissionsRole] = useState<Role | null>(null);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [deactivatingRole, setDeactivatingRole] = useState<Role | null>(null);

  const { mutate: deactivateRole, isPending: isDeactivating } = useDeactivateRole();
  const { mutate: activateRole } = useActivateRole();
  const { data: assignments = [], isFetching: isFetchingAssignments } = useRoleAssignments(
    deactivatingRole?.id ?? null,
  );

  function handleDeactivate(role: Role) {
    void queryClient.invalidateQueries({ queryKey: ['role-assignments', role.id] });
    setDeactivatingRole(role);
  }

  function handleDeactivateConfirm() {
    if (!deactivatingRole) return;
    deactivateRole(
      { id: deactivatingRole.id },
      {
        onSuccess: () => {
          toast.success(t('roles:toast.deactivated'), { duration: uiConfig.toast.durationMs });
          setDeactivatingRole(null);
        },
        onError: () => {
          toast.error(t('roles:toast.deactivateFailed'), {
            duration: uiConfig.toast.errorDurationMs,
          });
        },
      },
    );
  }

  function handleDeactivateCancel() {
    setDeactivatingRole(null);
  }

  async function handleActivate(role: Role) {
    const confirmed = await confirm(
      t('roles:confirm.activate.message', { name: role.name }),
      t('roles:confirm.activate.title'),
    );
    if (!confirmed) return;

    activateRole(
      { id: role.id },
      {
        onSuccess: () => {
          toast.success(t('roles:toast.activated'), { duration: uiConfig.toast.durationMs });
          void queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
        onError: () => {
          toast.error(t('roles:toast.activateFailed'), {
            duration: uiConfig.toast.errorDurationMs,
          });
        },
      },
    );
  }

  function handleEdit(role: Role) {
    setEditingRole(role);
    setIsDrawerOpen(true);
  }

  function handleManagePermissions(role: Role) {
    setPermissionsRole(role);
    setIsPermissionsOpen(true);
  }

  function handleDrawerHide() {
    setIsDrawerOpen(false);
    setEditingRole(null);
  }

  function handlePermissionsHide() {
    setIsPermissionsOpen(false);
    setPermissionsRole(null);
  }

  function handleSaved() {
    handleDrawerHide();
    void queryClient.invalidateQueries({ queryKey: ['roles'] });
  }

  function handlePermissionsSaved() {
    handlePermissionsHide();
    void queryClient.invalidateQueries({ queryKey: ['roles'] });
  }

  return (
    <div data-testid="roles-page">
      <PageHeader
        title={t('roles:page.title')}
        action={
          canManage ? (
            <AppButton
              onClick={() => {
                setEditingRole(null);
                setIsDrawerOpen(true);
              }}
            >
              <AddIcon aria-hidden="true" />
              {t('buttons:new')}
            </AppButton>
          ) : undefined
        }
      />

      <StandardDataGrid<Role>
        dataSource={roles}
        keyExpr="id"
        isLoading={isLoading}
        skeletonColumnCount={5}
        skeletonActionCount={1}
        skeletonShowPager
        noDataText={t('common:grid.noRecords')}
        columnAutoWidth
        className="overflow-hidden rounded-lg border border-border bg-surface-elevated"
      >
        <Paging defaultPageSize={25} />
        <Pager
          showPageSizeSelector
          allowedPageSizes={uiConfig.grid.allowedPageSizes}
          showInfo
          showNavigationButtons
        />

        {/* Name */}
        <Column dataField="name" caption={t('roles:columns.name')} minWidth={140} />

        {/* Description */}
        <Column
          dataField="description"
          caption={t('roles:columns.description')}
          minWidth={200}
          cellRender={({ data }: { data: Role }) => (
            <Typography
              variant="body-sm"
              as="span"
              className={data.description ? undefined : 'text-text-muted'}
            >
              {data.description || '-'}
            </Typography>
          )}
        />

        {/* Club */}
        <Column
          dataField="clubId"
          caption={t('roles:columns.club')}
          width={180}
          cellRender={({ data }: { data: Role }) => {
            const club = data.clubId ? clubs.find((c) => c.id === data.clubId) : null;
            return (
              <Typography
                variant="body-sm"
                as="span"
                className={club ? undefined : 'text-text-muted'}
              >
                {club ? club.name : '-'}
              </Typography>
            );
          }}
        />

        {/* Status */}
        <Column
          dataField="isActive"
          caption={t('roles:columns.status')}
          width={110}
          alignment="center"
          cellRender={({ data }: { data: Role }) => (
            <StatusBadge
              label={data.isActive ? t('roles:status.active') : t('roles:status.inactive')}
              variant={data.isActive ? 'success' : 'error'}
            />
          )}
        />

        {/* Actions */}
        <Column
          caption=""
          width={52}
          allowSorting={false}
          allowFiltering={false}
          fixed={true}
          fixedPosition="right"
          cssClass="actions-col"
          cellRender={({ data }: { data: Role }) => (
            <RoleGridRowActions
              role={data}
              canManage={canManage}
              onEdit={handleEdit}
              onManagePermissions={handleManagePermissions}
              onDeactivate={handleDeactivate}
              onActivate={handleActivate}
            />
          )}
        />
      </StandardDataGrid>

      <RoleDrawer
        visible={isDrawerOpen}
        onHide={handleDrawerHide}
        onSaved={handleSaved}
        role={editingRole}
      />

      <RolePermissionsEditor
        visible={isPermissionsOpen}
        onHide={handlePermissionsHide}
        onSaved={handlePermissionsSaved}
        role={permissionsRole}
      />

      <RoleDeactivateModal
        visible={deactivatingRole !== null}
        roleName={deactivatingRole?.name ?? ''}
        assignments={assignments}
        isLoading={isFetchingAssignments}
        isPending={isDeactivating}
        onConfirm={handleDeactivateConfirm}
        onCancel={handleDeactivateCancel}
      />
    </div>
  );
}
