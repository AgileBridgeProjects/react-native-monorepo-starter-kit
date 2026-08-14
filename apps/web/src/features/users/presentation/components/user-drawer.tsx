'use client';

import type { User } from '@features/users/domain/entities/user';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useConfirm } from '@lib/hooks/use-confirm';
import { ApiError } from '@lib/http';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { CheckIcon, LinkIcon, SaveIcon } from '@starterkit/icons';
import {
  CUSTOM_AUTH_EMAIL_DOMAIN,
  DEFAULT_PHONE_COUNTRY,
  getFullName,
  iconSize,
  splitName,
} from '@starterkit/shared';
import { parsePhoneNumber } from 'libphonenumber-js';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  ConfirmDialog,
  DrawerFooter,
  DrawerPanel,
  notify,
  StatusBadge,
} from '@/components/ui';
import { useAthleteSelectStore, useTeamSelectStore } from '@/lib/hooks';
import { AuthenticationMethod } from '@/proxy/models';
import { useAuthStore } from '@/store/auth-store';
import { useCreateUser } from '../hooks/use-create-user';
import { useDeleteUser } from '../hooks/use-delete-user';
import { useLinkUserToClub } from '../hooks/use-link-user-to-club';
import { useRemoveAvatar } from '../hooks/use-remove-avatar';
import { useRoles } from '../hooks/use-roles';
import { useSetUserActive } from '../hooks/use-set-user-active';
import { useUpdateUser } from '../hooks/use-update-user';
import { useUserDefaults } from '../hooks/use-user-defaults';
import { useUserDetails } from '../hooks/use-user-details';
import { type AddUserFormData, createAddUserSchema } from '../utils/add-user-schema';
import { resolveSingleSelectTeamIds } from '../utils/resolve-single-select-team-ids';
import { UserAccessSection } from './user-access-section';
import { UserAthleteDetailsSection } from './user-athlete-details-section';
import { UserAvatarRow } from './user-avatar-row';
import { UserFormSection } from './user-form-section';
import { UserMultiSelectSection } from './user-multi-select-section';
import { UserNameSection } from './user-name-section';
import { UserRoleSection } from './user-role-section';
import { UserSignInSection } from './user-sign-in-section';

// --- Props -------------------------------------------------------------------

interface UserDrawerProps {
  visible: boolean;
  onHide: () => void;
  defaultClubId: string | null;
  /** Display name of the selected club — shown as context at the top of the drawer. */
  defaultClubName?: string | null;
  /** Pre-selected team from the workspace switcher. Used to pre-populate the dropdown in create mode. */
  defaultTeamId?: string | null;
  /** When provided, the drawer opens in edit mode with pre-populated fields. */
  editUser?: User | null;
  /** Called after a user is successfully created/updated/deleted so the caller can reload the grid. */
  onSaved?: () => void;
}

// --- Constants ---------------------------------------------------------------

const emptyValues: AddUserFormData = {
  firstName: '',
  lastName: '',
  roleName: '',
  teamId: '',
  authMethod: AuthenticationMethod.CustomAuthentication,
  email: '',
  countryCode: DEFAULT_PHONE_COUNTRY,
  phoneNumber: '',
  username: '',
  password: '',
  dateOfBirth: '',
  position: undefined,
  jerseyNumber: '',
  teamIds: [],
  dependentUserIds: [],
  parentGuardianEmail: '',
};

export function UserDrawer({
  visible,
  onHide,
  defaultClubId,
  defaultClubName,
  defaultTeamId,
  editUser,
  onSaved,
}: UserDrawerProps) {
  const { t } = useTranslation();
  const { confirm, confirmDialog } = useConfirm();
  const currentUserEmail = useAuthStore((s) => s.user?.email);
  const isEditMode = !!editUser;
  const schema = useMemo(
    () => createAddUserSchema(isEditMode, editUser?.authMethod),
    [isEditMode, editUser?.authMethod],
  );
  const isCurrentUser =
    isEditMode &&
    !!currentUserEmail &&
    (editUser?.email === currentUserEmail ||
      (currentUserEmail.endsWith(CUSTOM_AUTH_EMAIL_DOMAIN) &&
        (editUser?.email === currentUserEmail.slice(0, -CUSTOM_AUTH_EMAIL_DOMAIN.length) ||
          editUser?.username === currentUserEmail.slice(0, -CUSTOM_AUTH_EMAIL_DOMAIN.length))));

  const { mutate: createUser, isPending: isCreating } = useCreateUser();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const { mutate: setUserActive, isPending: isToggling } = useSetUserActive();
  const { mutate: linkUser, isPending: isLinking } = useLinkUserToClub();
  const { mutateAsync: removeAvatar, isPending: isRemovingAvatar } = useRemoveAvatar();
  const { data: roles = [] } = useRoles();
  const { data: userDefaults } = useUserDefaults();
  const deptStore = useTeamSelectStore(defaultClubId ?? undefined);
  const athleteStore = useAthleteSelectStore(defaultClubId ?? undefined);
  // the identity split edit-mode parity: dependentUserIds is only populated on this single-user fetch,
  // not the grid row `editUser` prop (which comes from the paginated list endpoint).
  const { data: userDetails } = useUserDetails(editUser?.id, visible && isEditMode);

  const isPending =
    isCreating || isUpdating || isDeleting || isToggling || isLinking || isRemovingAvatar;

  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isDirty, isValid, touchedFields },
  } = useForm<AddUserFormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: emptyValues,
    mode: 'onChange',
  });

  const authMethod = watch('authMethod');
  const countryCode = watch('countryCode');
  const roleName = watch('roleName');
  // Athlete/Coach use the many-to-many Team Assignment section instead of the legacy single
  // Team field — showing both would be a confusing duplicate picker for the same concept.
  // Applies in both create and edit mode.
  const isTeamAssignmentRole = roleName === 'Athlete' || roleName === 'Coach';

  // A user whose identity spans multiple clubs cannot be promoted to an admin role
  const isMultiOrgUser = isEditMode && !!editUser?.isSharedAcrossClubs;
  const activeRoles = roles.filter((r) => r.isActive);
  // Show all general roles (no club) + club-scoped roles that belong to the selected club
  const scopeFilteredRoles = activeRoles.filter((r) => !r.clubId || r.clubId === defaultClubId);
  const availableRoles = isMultiOrgUser
    ? scopeFilteredRoles.filter((r) => !r.isElevated)
    : scopeFilteredRoles;

  const [isAvatarRemoved, setIsAvatarRemoved] = useState(false);

  function doClose() {
    reset(emptyValues);
    setIsAvatarRemoved(false);
    onHide();
  }

  function handleHide() {
    if (isDirty) {
      setIsDiscardOpen(true);
      return;
    }
    doClose();
  }

  async function handleRemoveAvatar() {
    if (!editUser) return;
    const confirmed = await confirm({
      title: t('users:confirm.removeAvatar.title'),
      message: t('users:confirm.removeAvatar.message', { name: editUser.displayName }),
      confirmLabel: t('users:confirm.removeAvatar.confirm'),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await removeAvatar(editUser.id);
      setIsAvatarRemoved(true);
      notify(t('users:toast.removeAvatarSuccess'), 'success', uiConfig.toast.durationMs);
      onSaved?.();
    } catch {
      notify(t('users:toast.removeAvatarFailed'), 'error', uiConfig.toast.errorDurationMs);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: availableRoles and emptyValues are stable module-level or derived values that don't need to be deps
  useEffect(() => {
    if (!visible) return;

    if (editUser) {
      // Edit mode — populate from existing user
      const { firstName, lastName } = splitName(editUser.displayName);

      // Parse E.164 phone number into country + national number for the split input.
      let countryCode: string = DEFAULT_PHONE_COUNTRY;
      let localPhone = editUser.phoneNumber ?? '';
      if (localPhone) {
        try {
          const parsed = parsePhoneNumber(localPhone);
          if (parsed?.country) {
            countryCode = parsed.country;
            localPhone = parsed.nationalNumber;
          }
        } catch {
          // Keep defaults — raw value displayed as-is.
        }
      }

      reset({
        firstName,
        lastName,
        roleName: editUser.roles[0] ?? '',
        teamId: editUser.teamIds[0] ?? '',
        authMethod: editUser.authMethod,
        email: editUser.email ?? '',
        countryCode,
        phoneNumber: localPhone,
        username: editUser.username ?? '',
        password: '',
        dateOfBirth: editUser.dateOfBirth ?? '',
        position: editUser.position ?? undefined,
        jerseyNumber: editUser.jerseyNumber != null ? String(editUser.jerseyNumber) : '',
        // teamIds/dependentUserIds aren't on the grid row — patched in by the effect below
        // once useUserDetails resolves.
        teamIds: [],
        dependentUserIds: [],
        parentGuardianEmail: '',
      });
    } else {
      // Create mode — email/Credentials only in this phase (only email is used for sign-in);
      // pre-populate team from workspace switcher if selected.
      const defaultRole = availableRoles.find((r) => r.isDefault);
      reset({
        ...emptyValues,
        authMethod: AuthenticationMethod.Credentials,
        teamId: defaultTeamId ?? '',
        roleName: defaultRole?.name ?? '',
        email: '',
      });
    }
  }, [visible, reset, editUser, defaultTeamId]);

  // the identity split edit-mode parity: refresh teamIds/dependentUserIds once the single-user fetch
  // resolves — dependentUserIds isn't on the grid row at all, and teamIds benefits from the
  // fresher single-user read even though the grid row now carries an initial value too.
  useEffect(() => {
    if (!visible || !isEditMode || !userDetails) return;
    setValue('teamIds', userDetails.teamIds, { shouldDirty: false });
    setValue('dependentUserIds', userDetails.dependentUserIds, { shouldDirty: false });
  }, [visible, isEditMode, userDetails, setValue]);

  // Notify admin when editing a user whose identity is shared across organisations
  useEffect(() => {
    if (visible && isMultiOrgUser) {
      notify(
        t('users:editUser.toast.sharedUserRoleRestricted'),
        'warning',
        uiConfig.toast.durationMs,
      );
    }
  }, [visible, isMultiOrgUser, t]);

  // Auto-populate the default password when CustomAuthentication is selected in create mode.
  // Only pre-fills when the API returns a non-empty value (Key Vault secret configured).
  // Leaves the field blank otherwise so the admin is forced to supply a password.
  const passwordValue = watch('password');
  useEffect(() => {
    const isCustomAuth = authMethod === AuthenticationMethod.CustomAuthentication;
    if (isCustomAuth && !isEditMode && !passwordValue) {
      const defaultPwd = userDefaults?.defaultPassword;
      if (defaultPwd) {
        setValue('password', defaultPwd, { shouldValidate: true });
      }
    }
  }, [authMethod, isEditMode, passwordValue, userDefaults, setValue]);

  /** Maps a backend ConflictException error code to a localised toast key. */
  function conflictKeyFor(code: string | undefined, fallback: string): string {
    switch (code) {
      case 'max-users-reached':
        return 'users:addUser.toast.userLimitReached';
      case 'email-conflict':
        return 'users:addUser.toast.emailConflict';
      case 'phone-conflict':
        return 'users:addUser.toast.phoneConflict';
      case 'username-conflict':
        return 'users:addUser.toast.usernameConflict';
      case 'admin-user-cannot-be-linked':
        return 'users:addUser.toast.adminUserConflict';
      case 'admin-role-multi-club':
        return 'users:editUser.toast.sharedUserRoleRestricted';
      default:
        return fallback;
    }
  }

  function handleLinkConfirmed(userId: string, data: AddUserFormData) {
    if (!defaultClubId) return;
    linkUser(
      { userId, clubId: defaultClubId, role: data.roleName },
      {
        onSuccess: () => {
          notify(t('users:addUser.toast.linkSuccess'), 'success', uiConfig.toast.durationMs);
          onSaved?.();
          doClose();
        },
        onError: (error: unknown) => {
          if (error instanceof ApiError && error.isConflict) {
            const msgKey = conflictKeyFor(error.code, 'users:addUser.toast.linkFailed');
            notify(t(msgKey), 'error', uiConfig.toast.errorDurationMs);
            return;
          }
          notify(t('users:addUser.toast.linkFailed'), 'error', uiConfig.toast.errorDurationMs);
        },
      },
    );
  }

  async function handleConflictError(error: ApiError, data: AddUserFormData) {
    if (error.code === 'user-exists-other-club' && error.conflictingEntityId) {
      const confirmed = await confirm({
        title: t('users:addUser.toast.linkUserConfirmTitle'),
        message: t('users:addUser.toast.linkUserConfirmMessage'),
        confirmLabel: t('users:addUser.toast.linkUserConfirmAccept'),
        icon: <LinkIcon size={iconSize.sm} />,
      });
      if (confirmed) {
        handleLinkConfirmed(error.conflictingEntityId, data);
      }
      return;
    }

    notify(
      t(conflictKeyFor(error.code, 'users:addUser.toast.createConflict')),
      'error',
      uiConfig.toast.errorDurationMs,
    );
  }

  function handleSubmitForm(data: AddUserFormData) {
    void submitUserWithConfirmation(data);
  }

  async function submitUserWithConfirmation(data: AddUserFormData) {
    if (!defaultClubId) return;

    const fullName = getFullName(data.firstName, data.lastName);

    const confirmed = await confirm({
      title: isEditMode ? t('users:confirm.save.editTitle') : t('users:confirm.save.createTitle'),
      message: isEditMode
        ? t('users:confirm.save.editMessage', { name: fullName })
        : t('users:confirm.save.createMessage', { name: fullName }),
      confirmLabel: isEditMode
        ? t('users:confirm.save.editConfirm')
        : t('users:confirm.save.createConfirm'),
      icon: isEditMode ? <SaveIcon size={iconSize.sm} /> : <CheckIcon size={iconSize.sm} />,
    });
    if (!confirmed) return;

    if (isEditMode && editUser) {
      // the identity split: there is no sign-in method picker in edit mode — the drawer only ever sends
      // the field that matches the user's existing (unchanged) auth method.
      const targetMethod = editUser.authMethod;
      const usesEmail =
        targetMethod === AuthenticationMethod.Credentials ||
        targetMethod === AuthenticationMethod.Google ||
        targetMethod === AuthenticationMethod.Microsoft365;
      const usesPhone = targetMethod === AuthenticationMethod.PhoneOtp;
      const isTeamAssignmentSubmitRole = data.roleName === 'Athlete' || data.roleName === 'Coach';

      // --- Update existing user ---------------------------------
      updateUser(
        {
          id: editUser.id,
          roleName: data.roleName,
          firstName: data.firstName,
          lastName: data.lastName,
          email: usesEmail ? data.email || undefined : undefined,
          phoneNumber: usesPhone ? data.phoneNumber || undefined : undefined,
          username: data.username || undefined,
          password: data.password || undefined,
          // the identity split edit-mode parity: only send role-specific fields for the role they
          // actually apply to (same reasoning as create — stale values can persist in RHF
          // state across role switches).
          dateOfBirth: data.roleName === 'Athlete' ? data.dateOfBirth || undefined : undefined,
          position: data.roleName === 'Athlete' ? data.position || undefined : undefined,
          jerseyNumber:
            data.roleName === 'Athlete' && data.jerseyNumber
              ? Number(data.jerseyNumber)
              : undefined,
          // Athlete/Coach use the many-to-many Team Assignment field directly; every other role's
          // single "Team" select goes through resolveSingleSelectTeamIds. Preserve
          // against the fresh single-user fetch, not the grid row snapshot, which can be stale.
          teamIds: isTeamAssignmentSubmitRole
            ? (data.teamIds ?? [])
            : resolveSingleSelectTeamIds(data.teamId, userDetails?.teamIds ?? editUser.teamIds),
          dependentUserIds: data.roleName === 'Parent' ? (data.dependentUserIds ?? []) : undefined,
          parentGuardianEmail:
            data.roleName === 'Athlete' ? data.parentGuardianEmail || undefined : undefined,
        },
        {
          onSuccess: () => {
            notify(t('users:editUser.toast.updated'), 'success', uiConfig.toast.durationMs);
            onSaved?.();
            doClose();
          },
          onError: (error) => {
            if (error instanceof ApiError && error.isConflict) {
              notify(
                t(conflictKeyFor(error.code, 'users:editUser.toast.updateConflict')),
                'error',
                uiConfig.toast.errorDurationMs,
              );
              return;
            }
            notify(t('users:editUser.toast.updateFailed'), 'error', uiConfig.toast.errorDurationMs);
          },
        },
      );
    } else {
      // --- Create new user --------------------------------------
      const isTeamAssignmentSubmitRole = data.roleName === 'Athlete' || data.roleName === 'Coach';
      createUser(
        {
          clubId: defaultClubId,
          roleName: data.roleName,
          firstName: data.firstName,
          lastName: data.lastName,
          authMethod: data.authMethod,
          email: data.email || undefined,
          phoneNumber: data.phoneNumber || undefined,
          username: data.username || undefined,
          password: data.password || undefined,
          // the identity split: only send role-specific fields for the role they actually apply to —
          // the underlying form fields persist in RHF state across role switches, so without
          // this a stale Athlete/Coach/Parent selection could leak into an unrelated role's payload.
          dateOfBirth: data.roleName === 'Athlete' ? data.dateOfBirth || undefined : undefined,
          position: data.roleName === 'Athlete' ? data.position || undefined : undefined,
          jerseyNumber:
            data.roleName === 'Athlete' && data.jerseyNumber
              ? Number(data.jerseyNumber)
              : undefined,
          // Athlete/Coach use the many-to-many Team Assignment field directly; every other role's
          // single "Team" select goes through resolveSingleSelectTeamIds. No
          // existingTeamIds in create mode — there's nothing to preserve yet.
          teamIds:
            isTeamAssignmentSubmitRole && data.teamIds && data.teamIds.length > 0
              ? data.teamIds
              : !isTeamAssignmentSubmitRole
                ? resolveSingleSelectTeamIds(data.teamId)
                : undefined,
          dependentUserIds:
            data.roleName === 'Parent' && data.dependentUserIds && data.dependentUserIds.length > 0
              ? data.dependentUserIds
              : undefined,
          parentGuardianEmail:
            data.roleName === 'Athlete' ? data.parentGuardianEmail || undefined : undefined,
        },
        {
          onSuccess: () => {
            notify(t('users:addUser.toast.created'), 'success', uiConfig.toast.durationMs);
            onSaved?.();
            doClose();
          },
          onError: (error) => {
            if (error instanceof ApiError && error.isConflict) {
              void handleConflictError(error, data);
              return;
            }
            if (error instanceof ApiError && error.status === 400) {
              notify(error.message, 'error', uiConfig.toast.errorDurationMs);
              return;
            }
            notify(t('users:addUser.toast.createFailed'), 'error', uiConfig.toast.errorDurationMs);
          },
        },
      );
    }
  }

  async function handleToggleActive() {
    if (!editUser) return;
    if (isCurrentUser) {
      notify(t('users:toast.cannotDisableSelf'), 'warning', uiConfig.toast.durationMs);
      return;
    }
    const suspending = editUser.isActive;
    const confirmed = await confirm({
      title: t(suspending ? 'users:confirm.suspend.title' : 'users:confirm.activate.title'),
      message: t(suspending ? 'users:confirm.suspend.message' : 'users:confirm.activate.message'),
      confirmLabel: t(
        suspending ? 'users:confirm.suspend.confirm' : 'users:confirm.activate.confirm',
      ),
      destructive: suspending,
      icon: suspending ? undefined : <CheckIcon size={iconSize.sm} />,
    });
    if (!confirmed) return;

    setUserActive(
      { id: editUser.id, isActive: !editUser.isActive },
      {
        onSuccess: () => {
          notify(
            t(suspending ? 'users:toast.suspended' : 'users:toast.activated'),
            'success',
            uiConfig.toast.durationMs,
          );
          onSaved?.();
          doClose();
        },
        onError: () => {
          notify(t('users:toast.statusUpdateFailed'), 'error', uiConfig.toast.errorDurationMs);
        },
      },
    );
  }

  async function handleDelete() {
    if (!editUser) return;
    const confirmed = await confirm({
      title: t('users:confirm.delete.title'),
      message: t('users:confirm.delete.message'),
      confirmLabel: t('users:confirm.delete.confirm'),
      destructive: true,
    });
    if (!confirmed) return;

    deleteUser(editUser.id, {
      onSuccess: () => {
        notify(t('users:editUser.toast.deleted'), 'success', uiConfig.toast.durationMs);
        onSaved?.();
        doClose();
      },
      onError: () => {
        notify(t('users:editUser.toast.deleteFailed'), 'error', uiConfig.toast.errorDurationMs);
      },
    });
  }

  const extraActions = isEditMode ? (
    <div className="flex gap-sm">
      <Button
        variant="outlined"
        className={editUser?.isActive ? 'border-error/40 text-error hover:bg-error/10' : undefined}
        onClick={handleToggleActive}
        disabled={isPending || isCurrentUser}
        title={isCurrentUser ? t('users:toast.cannotDisableSelf') : undefined}
        data-testid="users-toggle-active-button"
      >
        {t(
          editUser?.isActive ? 'users:editUser.actions.suspend' : 'users:editUser.actions.activate',
        )}
      </Button>
      <Button
        variant="ghost"
        className="text-error hover:bg-error/10"
        onClick={handleDelete}
        disabled={isPending}
        data-testid="users-delete-button"
      >
        {t('users:editUser.actions.delete')}
      </Button>
    </div>
  ) : undefined;

  const drawerTitle = isEditMode ? t('users:editUser.title') : t('users:addUser.title');
  const titleContent = isCurrentUser ? (
    <span className="flex items-center gap-2">
      {drawerTitle}
      <StatusBadge label={t('users:indicator.you')} variant="primary" />
    </span>
  ) : (
    drawerTitle
  );

  const bottomContent = (
    <DrawerFooter
      leading={extraActions}
      cancelLabel={t('buttons:cancel')}
      onCancel={handleHide}
      submitLabel={t(isEditMode ? 'users:editUser.saveButton' : 'users:addUser.createButton')}
      onSubmit={handleSubmit(handleSubmitForm)}
      isLoading={isPending}
      disabled={!isValid || isPending}
      submitTestId="user-submit-button"
    />
  );

  return (
    <>
      {confirmDialog}
      <ConfirmDialog
        visible={isDiscardOpen}
        title={t('common:confirm.unsavedChanges.title')}
        message={t('common:confirm.unsavedChanges.message')}
        confirmLabel={t('common:confirm.unsavedChanges.discard')}
        cancelLabel={t('common:confirm.unsavedChanges.keepEditing')}
        onConfirm={() => {
          setIsDiscardOpen(false);
          doClose();
        }}
        onCancel={() => setIsDiscardOpen(false)}
        destructive
      />
      <DrawerPanel
        visible={visible}
        onHide={handleHide}
        title={titleContent}
        subtitle={!isEditMode && defaultClubName ? defaultClubName : undefined}
        bottomContent={bottomContent}
        data-testid="add-user-drawer"
      >
        <div className="space-y-md p-lg">
          {/* ── Role (first — every other section branches on it) ──────────── */}
          <UserFormSection title={t('users:addUser.sections.role')} first />

          <UserRoleSection
            control={control}
            errors={errors}
            availableRoles={availableRoles}
            isMultiOrgUser={isMultiOrgUser}
          />

          {/* ── Name ────────────────────────────────────────────────────── */}
          <UserFormSection title={t('users:addUser.sections.name')} />

          {isEditMode && editUser?.avatarUrl && !isAvatarRemoved && (
            <UserAvatarRow user={editUser} isPending={isPending} onRemove={handleRemoveAvatar} />
          )}

          <UserNameSection control={control} errors={errors} />

          {/* ── Sign-in ─────────────────────────────────────────────────── */}
          <UserFormSection title={t('users:addUser.sections.signIn')} />

          <UserSignInSection
            control={control}
            errors={errors}
            emailTouched={!!touchedFields.email}
            setValue={setValue}
            authMethod={authMethod}
            countryCode={countryCode}
            isEditMode={isEditMode}
            editUser={editUser}
            roleName={roleName}
          />

          {/* ── Access ──────────────────────────────────────────────────── */}
          {!!defaultClubId && !isTeamAssignmentRole && (
            <UserFormSection title={t('users:addUser.sections.access')} />
          )}

          <UserAccessSection
            control={control}
            errors={errors}
            defaultClubId={defaultClubId}
            deptStore={deptStore}
            hideTeamField={isTeamAssignmentRole}
          />

          {/* ── Role-specific fields — shown in both create and edit mode ────── */}
          {roleName === 'Athlete' && (
            <>
              <UserFormSection title={t('users:addUser.sections.athleteDetails')} />
              <UserAthleteDetailsSection control={control} errors={errors} />
              <UserMultiSelectSection
                control={control}
                errors={errors}
                fieldName="teamIds"
                htmlFor="user-team-assignment"
                label={t('users:addUser.form.teamAssignment.label')}
                placeholder={t('users:addUser.form.teamAssignment.placeholder')}
                dataSource={deptStore}
                displayExpr="name"
                searchExpr="name"
              />
            </>
          )}

          {roleName === 'Coach' && (
            <>
              <UserFormSection title={t('users:addUser.sections.teamAssignment')} />
              <UserMultiSelectSection
                control={control}
                errors={errors}
                fieldName="teamIds"
                required
                htmlFor="user-team-assignment"
                label={t('users:addUser.form.teamAssignment.label')}
                placeholder={t('users:addUser.form.teamAssignment.placeholder')}
                dataSource={deptStore}
                displayExpr="name"
                searchExpr="name"
              />
            </>
          )}

          {roleName === 'Parent' && (
            <>
              <UserFormSection title={t('users:addUser.sections.linkedAthletes')} />
              <UserMultiSelectSection
                control={control}
                errors={errors}
                fieldName="dependentUserIds"
                required
                htmlFor="user-linked-athletes"
                label={t('users:addUser.form.linkedAthletes.label')}
                placeholder={t('users:addUser.form.linkedAthletes.placeholder')}
                dataSource={athleteStore}
                displayExpr="displayName"
                searchExpr="displayName"
              />
            </>
          )}
        </div>
      </DrawerPanel>
    </>
  );
}
