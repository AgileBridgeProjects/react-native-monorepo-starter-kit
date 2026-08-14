'use client';

import { useLogout } from '@features/auth/presentation/hooks/use-auth';
import { useCurrentSession } from '@features/auth/presentation/hooks/use-current-session';
import type { User } from '@features/users/domain/entities/user';
import {
  type BulkResendFilter,
  BulkResendSetupModal,
} from '@features/users/presentation/components/bulk-resend-setup-modal';
import { ChangePasswordDrawer } from '@features/users/presentation/components/change-password-drawer';
import { UserBulkUploadDialog } from '@features/users/presentation/components/user-bulk-upload-dialog';
import { UserDetailPanel } from '@features/users/presentation/components/user-detail-panel';
import { UserDrawer } from '@features/users/presentation/components/user-drawer';
import { UserGrid } from '@features/users/presentation/components/user-grid';
import { useAdminChangePassword } from '@features/users/presentation/hooks/use-admin-change-password';
import { useExportUsers } from '@features/users/presentation/hooks/use-export-users';
import {
  fetchResendEligibleUserIds,
  useResendEligibleCounts,
} from '@features/users/presentation/hooks/use-resend-eligible-users';
import { useResendSetup } from '@features/users/presentation/hooks/use-resend-setup';
import { useSetUserActive } from '@features/users/presentation/hooks/use-set-user-active';
import { useTeamOptions } from '@features/users/presentation/hooks/use-team-options';
import { useUserGridStore } from '@features/users/presentation/hooks/use-user-grid-store';
import { isMatchingUser } from '@features/users/presentation/utils/user-display';
import { useEffectiveClubId } from '@features/workspace/presentation/hooks/use-effective-club-id';
import { copyToClipboard, downloadBlob } from '@lib/browser-utils';
import { useConfirm } from '@lib/hooks/use-confirm';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import {
  AddIcon,
  CheckIcon,
  CloudUploadIcon,
  DownloadIcon,
  EmailIcon,
  RefreshIcon,
} from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { useMemo, useRef, useState } from 'react';
import {
  ActionMenu,
  Button as AppButton,
  type EntityDataGridHandle,
  notify,
  PageHeader,
} from '@/components/ui';
import type { SetupStatus } from '@/proxy/models';
import { useAuthStore } from '@/store/auth-store';
import { useWorkspaceStore } from '@/store/workspace-store';

// ─── Component ───────────────────────────────────────────────────────────────

export function UsersView() {
  const { t } = useTranslation();
  const { confirm, confirmDialog } = useConfirm();
  const currentUserEmail = useAuthStore((s) => s.user?.email);
  const { hasPermission } = useCurrentSession();
  const canManage = hasPermission('StarterKit.Users.Manage');
  // the identity split: bulk upload is a Super Admin-only action — Club Admins/Directors fill in the
  // template offline but don't use the portal's bulk-upload flow themselves.
  const canBulkManage = hasPermission('StarterKit.Users.BulkManage');

  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [setupStatusFilter, setSetupStatusFilter] = useState<SetupStatus | undefined>(undefined);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [changePasswordUser, setChangePasswordUser] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isBulkResendOpen, setIsBulkResendOpen] = useState(false);
  const [bulkResendFilter, setBulkResendFilter] = useState<BulkResendFilter>('both');
  const [isBulkResendPending, setIsBulkResendPending] = useState(false);
  const [isBulkPending, setIsBulkPending] = useState(false);
  const [disablingUserId, setDisablingUserId] = useState<string | null>(null);
  const gridRef = useRef<EntityDataGridHandle>(null);

  const {
    clubId: selectedClubId,
    clubName: selectedClubName,
    teamId: selectedTeamId,
  } = useWorkspaceStore();
  const effectiveClubId = useEffectiveClubId(selectedClubId);

  const { data: teamOptions = [] } = useTeamOptions(effectiveClubId);

  // Build a lookup map from team ID → name for the grid column
  const deptNameMap = useMemo(() => new Map(teamOptions.map((d) => [d.id, d.name])), [teamOptions]);

  const { store } = useUserGridStore({
    clubId: effectiveClubId ?? undefined,
    teamId: selectedTeamId ?? undefined,
    isActive: statusFilter,
    roleName: roleFilter,
    setupStatus: setupStatusFilter,
  });

  const { pendingCount: resendPendingCount, expiredCount: resendExpiredCount } =
    useResendEligibleCounts(effectiveClubId);

  const { mutate: setUserActive } = useSetUserActive();
  const { mutateAsync: resendSetup } = useResendSetup();
  const { mutateAsync: exportUsers, isPending: isExporting } = useExportUsers();
  const { mutateAsync: adminChangePassword, isPending: isChangingPassword } =
    useAdminChangePassword();
  const { mutateAsync: logout } = useLogout();

  async function handleBulkEnable() {
    if (selectedUserIds.length === 0) return;
    setIsBulkPending(true);
    try {
      const confirmed = await confirm({
        title: t('users:confirm.bulkEnable.title'),
        message: t('users:confirm.bulkEnable.message', { count: selectedUserIds.length }),
        confirmLabel: t('users:confirm.bulkEnable.confirm'),
        icon: <CheckIcon size={iconSize.sm} />,
      });
      if (!confirmed) return;

      let successCount = 0;
      for (const id of selectedUserIds) {
        try {
          await new Promise<void>((resolve, reject) => {
            setUserActive(
              { id, isActive: true },
              {
                onSuccess: () => {
                  successCount++;
                  resolve();
                },
                onError: reject,
              },
            );
          });
        } catch {
          // continue with remaining users
        }
      }
      if (successCount > 0) {
        notify(
          t('users:toast.bulkEnableSuccess', { count: successCount }),
          'success',
          uiConfig.toast.durationMs,
        );
        setSelectedUserIds([]);
        gridRef.current?.clearSelection();
        store.reload();
      }
    } finally {
      setIsBulkPending(false);
    }
  }

  async function handleBulkDisable() {
    if (selectedUserIds.length === 0) return;
    setIsBulkPending(true);
    try {
      // Exclude the current user from the disable batch
      const selectedRows = (gridRef.current?.getSelectedRowsData() ?? []) as User[];
      const selfRow = selectedRows.find((u) => isMatchingUser(currentUserEmail, u));
      const idsToDisable = selfRow
        ? selectedUserIds.filter((id) => id !== selfRow.id)
        : selectedUserIds;

      if (idsToDisable.length === 0) {
        notify(t('users:toast.cannotDisableSelf'), 'warning', uiConfig.toast.durationMs);
        return;
      }

      const selfExcluded = idsToDisable.length < selectedUserIds.length;
      const message = selfExcluded
        ? t('users:confirm.bulkSuspend.selfExcluded', { count: idsToDisable.length })
        : t('users:confirm.bulkSuspend.message', { count: idsToDisable.length });

      const confirmed = await confirm({
        title: t('users:confirm.bulkSuspend.title'),
        message,
        confirmLabel: t('users:confirm.bulkSuspend.confirm'),
        destructive: true,
      });
      if (!confirmed) return;

      let successCount = 0;
      for (const id of idsToDisable) {
        try {
          await new Promise<void>((resolve, reject) => {
            setUserActive(
              { id, isActive: false },
              {
                onSuccess: () => {
                  successCount++;
                  resolve();
                },
                onError: reject,
              },
            );
          });
        } catch {
          // continue with remaining users
        }
      }
      if (successCount > 0) {
        notify(
          t('users:toast.bulkSuspendSuccess', { count: successCount }),
          'success',
          uiConfig.toast.durationMs,
        );
        setSelectedUserIds([]);
        gridRef.current?.clearSelection();
        store.reload();
      }
    } finally {
      setIsBulkPending(false);
    }
  }

  async function handleBulkToggle() {
    if (selectedUserIds.length === 0) return;
    setIsBulkPending(true);
    try {
      // Exclude the current user — they cannot disable their own account.
      const selectedRows = (gridRef.current?.getSelectedRowsData() ?? []) as User[];
      const selfRow = selectedRows.find((u) => isMatchingUser(currentUserEmail, u));
      const rowsToToggle = selfRow ? selectedRows.filter((u) => u.id !== selfRow.id) : selectedRows;

      if (rowsToToggle.length === 0) {
        notify(t('users:toast.cannotDisableSelf'), 'warning', uiConfig.toast.durationMs);
        return;
      }

      const selfExcluded = rowsToToggle.length < selectedRows.length;
      const message = selfExcluded
        ? t('users:confirm.bulkToggle.selfExcluded', { count: rowsToToggle.length })
        : t('users:confirm.bulkToggle.message', { count: rowsToToggle.length });

      const confirmed = await confirm({
        title: t('users:confirm.bulkToggle.title'),
        message,
        confirmLabel: t('users:confirm.bulkToggle.confirm'),
        icon: <RefreshIcon size={iconSize.sm} />,
      });
      if (!confirmed) return;

      let successCount = 0;
      for (const user of rowsToToggle) {
        try {
          await new Promise<void>((resolve, reject) => {
            setUserActive(
              { id: user.id, isActive: !user.isActive },
              {
                onSuccess: () => {
                  successCount++;
                  resolve();
                },
                onError: reject,
              },
            );
          });
        } catch {
          // continue with remaining users
        }
      }
      if (successCount > 0) {
        notify(
          t('users:toast.bulkToggleSuccess', { count: successCount }),
          'success',
          uiConfig.toast.durationMs,
        );
        setSelectedUserIds([]);
        gridRef.current?.clearSelection();
        store.reload();
      }
    } finally {
      setIsBulkPending(false);
    }
  }

  async function handleDisableSingleUser(user: User) {
    if (isMatchingUser(currentUserEmail, user)) {
      notify(t('users:toast.cannotDisableSelf'), 'warning', uiConfig.toast.durationMs);
      return;
    }
    const confirmed = await confirm({
      title: t('users:confirm.suspend.title'),
      message: t('users:confirm.suspend.message'),
      confirmLabel: t('users:confirm.suspend.confirm'),
      destructive: true,
    });
    if (!confirmed) return;
    setDisablingUserId(user.id);
    setUserActive(
      { id: user.id, isActive: false },
      {
        onSuccess: () => {
          setDisablingUserId(null);
          notify(
            t('users:toast.bulkSuspendSuccess', { count: 1 }),
            'success',
            uiConfig.toast.durationMs,
          );
          store.reload();
        },
        onError: () => {
          setDisablingUserId(null);
        },
      },
    );
  }

  function handleAddUser() {
    setEditingUser(null);
    setIsDrawerOpen(true);
  }

  function handleEditFromDetailPanel(user: User) {
    setDetailUser(null);
    setEditingUser(user);
    setIsDrawerOpen(true);
  }

  function handleBulkUpload() {
    setIsBulkUploadOpen(true);
  }

  async function handleChangePassword(newPassword: string) {
    if (!changePasswordUser) return;
    const isSelf = isMatchingUser(currentUserEmail, changePasswordUser);

    try {
      await adminChangePassword({ userId: changePasswordUser.id, newPassword });
    } catch {
      notify(t('users:toast.passwordChangeFailed'), 'error', uiConfig.toast.durationMs);
      return;
    }

    setChangePasswordUser(null);
    notify(t('users:toast.passwordChanged'), 'success', uiConfig.toast.durationMs);

    if (isSelf) {
      // Best-effort: logout to force reauthentication with the new password.
      // If this fails, the admin is still logged in with a valid session — not critical.
      try {
        await logout();
      } catch {
        // Intentionally swallowed — password change succeeded.
      }
    }
  }

  async function handleExport() {
    if (!effectiveClubId) return;
    try {
      const blob = await exportUsers({
        clubId: effectiveClubId,
        teamId: selectedTeamId ?? undefined,
      });
      const filename = selectedTeamId
        ? `users-export-dept-${selectedTeamId}.xlsx`
        : `users-export-${effectiveClubId}.xlsx`;
      downloadBlob(blob, filename);
    } catch {
      notify(t('users:toast.exportFailed'), 'error', uiConfig.toast.errorDurationMs);
    }
  }

  async function handleResendSetupFromRow(user: User) {
    try {
      setResendingUserId(user.id);
      const setupLink = await resendSetup(user.id);
      let copied = false;
      if (setupLink) {
        copied = await copyToClipboard(setupLink);
      }
      notify(
        copied
          ? t('users:toast.resendSetupSuccess', { email: user.email })
          : t('users:toast.resendSetupEmailOnly', { email: user.email }),
        'success',
        uiConfig.toast.durationMs,
      );
    } catch {
      notify(t('users:toast.resendSetupFailed'), 'error', uiConfig.toast.errorDurationMs);
    } finally {
      setResendingUserId(null);
      void store.reload();
    }
  }

  async function handleBulkResendSetup(userIds: string[]) {
    if (userIds.length === 0) return;

    let successCount = 0;
    for (const userId of userIds) {
      try {
        await resendSetup(userId);
        successCount++;
      } catch {
        // continue with remaining users
      }
    }

    if (successCount === userIds.length) {
      notify(
        t('users:toast.bulkResendSetupSuccess', { count: successCount }),
        'success',
        uiConfig.toast.durationMs,
      );
    } else if (successCount > 0) {
      notify(
        t('users:toast.bulkResendSetupPartial', {
          success: successCount,
          failed: userIds.length - successCount,
        }),
        'warning',
        uiConfig.toast.durationMs,
      );
    }

    setSelectedUserIds([]);
    gridRef.current?.clearSelection();
    await store.reload();
  }

  async function handleBulkResendConfirm() {
    if (!effectiveClubId) return;
    setIsBulkResendPending(true);
    try {
      const userIds = await fetchResendEligibleUserIds(effectiveClubId, bulkResendFilter);
      await handleBulkResendSetup(userIds);
    } finally {
      setIsBulkResendPending(false);
      setIsBulkResendOpen(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col" data-testid="users-page">
      <PageHeader
        title={t('users:page.title')}
        action={
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                {canBulkManage && (
                  <AppButton
                    variant="outlined"
                    onClick={handleBulkUpload}
                    disabled={!effectiveClubId}
                    data-testid="users-bulk-upload-button"
                  >
                    <CloudUploadIcon aria-hidden="true" />
                    {t('users:actions.bulkUpload')}
                  </AppButton>
                )}

                <AppButton
                  onClick={handleAddUser}
                  disabled={!effectiveClubId}
                  data-testid="users-add-button"
                >
                  <AddIcon aria-hidden="true" />
                  {t('buttons:new')}
                </AppButton>

                <ActionMenu
                  aria-label={t('users:actions.moreActions')}
                  className="h-10 w-10 border border-border text-text-secondary hover:text-text"
                  menuClassName="min-w-56"
                  items={[
                    {
                      label: t('users:actions.export'),
                      icon: <DownloadIcon />,
                      onClick: handleExport,
                      disabled: isExporting,
                    },
                    {
                      label: t('users:actions.resendSetupLinks'),
                      icon: <EmailIcon />,
                      onClick: () => {
                        setBulkResendFilter('both');
                        setIsBulkResendOpen(true);
                      },
                    },
                  ]}
                />
              </>
            )}
          </div>
        }
      />

      {/* ─── User grid ──────────────────────────────────────────────────── */}
      <UserGrid
        key={currentUserEmail ?? ''}
        store={store}
        hasClubSelected={!!effectiveClubId}
        onSelectionChanged={setSelectedUserIds}
        selectedKeys={selectedUserIds}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        setupStatusFilter={setupStatusFilter}
        onSetupStatusFilterChange={setSetupStatusFilter}
        gridRef={gridRef}
        canManage={canManage}
        resendingUserId={resendingUserId}
        deptNameMap={deptNameMap}
        isCurrentUser={(user) => isMatchingUser(currentUserEmail, user)}
        onEditUser={(user) => {
          setEditingUser(user);
          setIsDrawerOpen(true);
        }}
        onViewDetails={(user) => setDetailUser(user)}
        onResendSetupLink={handleResendSetupFromRow}
        onDisableUser={handleDisableSingleUser}
        onChangePassword={(user) => setChangePasswordUser(user)}
        onBulkEnable={handleBulkEnable}
        onBulkDisable={handleBulkDisable}
        onBulkToggle={handleBulkToggle}
        isBulkPending={isBulkPending}
        disablingUserId={disablingUserId}
        onAvatarDeleted={() => void store.reload()}
        onClearSelection={() => {
          setSelectedUserIds([]);
          gridRef.current?.clearSelection();
        }}
      />

      {/* ─── User drawer (create + edit) ─────────────────────────────────── */}
      <UserDrawer
        visible={isDrawerOpen}
        onHide={() => {
          setIsDrawerOpen(false);
          setEditingUser(null);
        }}
        defaultClubId={effectiveClubId}
        defaultClubName={selectedClubName ?? null}
        defaultTeamId={selectedTeamId}
        editUser={editingUser}
        onSaved={() => {
          setSelectedUserIds([]);
          gridRef.current?.clearSelection();
          store.reload();
        }}
      />

      {/* ─── Change password drawer ──────────────────────────────────── */}
      <ChangePasswordDrawer
        visible={!!changePasswordUser}
        userName={changePasswordUser?.displayName ?? ''}
        isSelf={!!changePasswordUser && isMatchingUser(currentUserEmail, changePasswordUser)}
        isPending={isChangingPassword}
        onConfirm={handleChangePassword}
        onCancel={() => setChangePasswordUser(null)}
      />

      <UserDetailPanel
        user={detailUser}
        onHide={() => setDetailUser(null)}
        deptNameMap={deptNameMap}
        onEdit={canManage ? handleEditFromDetailPanel : undefined}
        canManage={canManage}
      />

      {confirmDialog}

      <BulkResendSetupModal
        visible={isBulkResendOpen}
        isPending={isBulkResendPending}
        filter={bulkResendFilter}
        pendingCount={resendPendingCount}
        expiredCount={resendExpiredCount}
        totalCount={resendPendingCount + resendExpiredCount}
        onHide={() => setIsBulkResendOpen(false)}
        onFilterChange={setBulkResendFilter}
        onConfirm={() => void handleBulkResendConfirm()}
      />

      {effectiveClubId && (
        <UserBulkUploadDialog
          visible={isBulkUploadOpen}
          clubId={effectiveClubId}
          teamId={selectedTeamId ?? undefined}
          onHide={() => setIsBulkUploadOpen(false)}
          onConfirmed={() => {
            setIsBulkUploadOpen(false);
            store.reload();
          }}
        />
      )}
    </div>
  );
}
