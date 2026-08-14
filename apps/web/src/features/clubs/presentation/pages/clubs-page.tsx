'use client';

import { useCurrentSession } from '@features/auth/presentation/hooks/use-current-session';
import type { Club } from '@features/clubs/domain/entities/club';
import { seasonDatasource } from '@features/clubs/infrastructure/datasources/season-datasource';
import { ClubDrawer } from '@features/clubs/presentation/components/club-drawer';
import { useClubs } from '@features/clubs/presentation/hooks/use-clubs';
import { useCreateClub } from '@features/clubs/presentation/hooks/use-create-club';
import { useCreateTeam } from '@features/clubs/presentation/hooks/use-create-team';
import { useDeleteClub } from '@features/clubs/presentation/hooks/use-delete-club';
import { useUpdateClub } from '@features/clubs/presentation/hooks/use-update-club';
import { type ClubFormData, clubSchema } from '@features/clubs/presentation/utils/club-schema';
import { ClubAvatar } from '@features/workspace/presentation/components/club-avatar';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { AddIcon, DeleteIcon, EditIcon, ShareWithTeamsIcon, UsersIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type Resolver, useForm, useWatch } from 'react-hook-form';
import {
  AccordionGrid,
  type AccordionGridParent,
  ActionMenu,
  type ActionMenuItem,
  Button as AppButton,
  Banner,
  ConfirmDialog,
  notify,
  PageHeader,
  PaginationFooter,
  StatusBadge,
  Typography,
} from '@/components/ui';
import { toDateOnly } from '@/components/ui/date-range-box.utils';
import { useWorkspaceStore } from '@/store/workspace-store';

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Super-Admin-only club directory (create/edit/delete a club's own record). Team and Season
 * management moved to the standalone Teams page — Club Managers who lack
 * `StarterKit.Clubs.Manage` never had access to this page, so team management needed a home
 * reachable via the club-scoped nav instead. This page only shows a read-only team count.
 */
export function ClubsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useCurrentSession();
  const canManage = hasPermission('StarterKit.Clubs.Manage');
  const canViewTeams = hasPermission('StarterKit.Teams.View');
  const router = useRouter();
  const setWorkspaceClub = useWorkspaceStore((s) => s.setClub);

  // Teams page reads its club from the workspace switcher, not a URL param — set it before
  // navigating so /teams resolves to the club whose row/action the user came from.
  function handleManageTeams(club: Club) {
    setWorkspaceClub({ id: club.id, name: club.name, logoUrl: club.logoUrl ?? null });
    router.push('/teams');
  }

  // ── Club list state ────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    data,
    isLoading: clubsLoading,
    isError: clubsError,
    refetch,
  } = useClubs({
    page: currentPage,
    pageSize,
  });

  const clubs = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // ── Add club dialog ────────────────────────────────────────────────────
  const [isAddClubOpen, setIsAddClubOpen] = useState(false);
  const { mutate: createClub, isPending: isCreating } = useCreateClub();
  const { mutateAsync: createTeam } = useCreateTeam();
  const { mutate: deleteClub } = useDeleteClub();
  const { mutate: updateClub, isPending: isSavingClub } = useUpdateClub();

  // ── Edit club drawer ───────────────────────────────────────────────────
  const [editingClub, setEditingClub] = useState<Club | null>(null);

  const {
    control: editControl,
    handleSubmit: editHandleSubmit,
    reset: editReset,
    setValue: editSetValue,
    formState: { errors: editErrors, isValid: editIsValid, isDirty: editIsDirty },
  } = useForm<ClubFormData>({
    resolver: standardSchemaResolver(clubSchema) as Resolver<ClubFormData>,
    defaultValues: {
      name: '',
      maxAthletes: null,
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      timezone: '',
      logoUrl: '',
    },
    mode: 'onChange',
  });

  // Pre-populate the edit form whenever the editing club changes.
  useEffect(() => {
    if (editingClub) {
      editReset({
        name: editingClub.name,
        maxAthletes: editingClub.maxAthletes ?? null,
        logoUrl: editingClub.logoUrl ?? '',
        streetAddress: editingClub.streetAddress ?? '',
        city: editingClub.city ?? '',
        state: editingClub.state ?? '',
        zipCode: editingClub.zipCode ?? '',
        timezone: editingClub.timezone ?? '',
      });
    }
  }, [editingClub, editReset]);

  // ── Create club confirmation ───────────────────────────────────────────
  const [isConfirmCreateOpen, setIsConfirmCreateOpen] = useState(false);
  const [pendingCreateData, setPendingCreateData] = useState<ClubFormData | null>(null);

  // ── Delete club confirmation ───────────────────────────────────────────
  const [confirmDeleteClub, setConfirmDeleteClub] = useState<Club | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid, isDirty },
  } = useForm<ClubFormData>({
    resolver: standardSchemaResolver(clubSchema) as Resolver<ClubFormData>,
    defaultValues: {
      name: '',
      maxAthletes: null,
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      timezone: '',
      logoUrl: '',
      seasonName: '',
      seasonStartDate: '',
      seasonEndDate: '',
      teams: [],
    },
    mode: 'onChange',
  });

  // The season date range is required at club creation but kept optional in the
  // shared zod schema so it doesn't block the edit form's validity — enforced here instead.
  const [watchedSeasonStartDate, watchedSeasonEndDate] = useWatch({
    control,
    name: ['seasonStartDate', 'seasonEndDate'],
  });
  const hasSeasonDates = !!watchedSeasonStartDate && !!watchedSeasonEndDate;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleOpenAddClub() {
    reset();
    setIsAddClubOpen(true);
  }

  function handleCloseAddClub() {
    setIsAddClubOpen(false);
    reset();
  }

  function handleSubmitCreateClub(data: ClubFormData) {
    setPendingCreateData(data);
    setIsConfirmCreateOpen(true);
  }

  function handleConfirmCreate() {
    if (!pendingCreateData) return;
    const teamRows = (pendingCreateData.teams ?? []).filter((tm) => tm.name.trim().length > 0);
    createClub(
      {
        name: pendingCreateData.name,
        streetAddress: pendingCreateData.streetAddress,
        city: pendingCreateData.city,
        state: pendingCreateData.state,
        zipCode: pendingCreateData.zipCode || undefined,
        maxAthletes: pendingCreateData.maxAthletes ?? undefined,
        logoUrl: pendingCreateData.logoUrl || undefined,
        timezone: pendingCreateData.timezone || undefined,
        seasonName: pendingCreateData.seasonName || undefined,
        seasonStartDate: pendingCreateData.seasonStartDate
          ? toDateOnly(pendingCreateData.seasonStartDate)
          : '',
        seasonEndDate: pendingCreateData.seasonEndDate
          ? toDateOnly(pendingCreateData.seasonEndDate)
          : '',
      },
      {
        onSuccess: async (club) => {
          if (teamRows.length > 0) {
            try {
              const seasons = await seasonDatasource.list(club.id);
              const seasonId = seasons[0]?.id;
              if (seasonId) {
                await Promise.all(
                  teamRows.map((tm) =>
                    createTeam({
                      seasonId,
                      name: tm.name,
                      ageGroup: tm.ageGroup || undefined,
                      logoUrl: tm.logoUrl || undefined,
                    }),
                  ),
                );
              }
            } catch {
              notify(
                t('errors:club.toast.teamsCreateFailed'),
                'error',
                uiConfig.toast.errorDurationMs,
              );
            }
          }
          notify(t('clubs:toast.created'), 'success', uiConfig.toast.durationMs);
          setIsConfirmCreateOpen(false);
          setPendingCreateData(null);
          handleCloseAddClub();
        },
        onError: () => {
          notify(t('errors:club.toast.createFailed'), 'error', uiConfig.toast.errorDurationMs);
          setIsConfirmCreateOpen(false);
        },
      },
    );
  }

  function handleCancelCreate() {
    setIsConfirmCreateOpen(false);
    setPendingCreateData(null);
  }

  function handleEditClub(club: Club) {
    setEditingClub(club);
  }

  function handleSaveEditClub(data: ClubFormData) {
    if (!editingClub) return;
    updateClub(
      {
        id: editingClub.id,
        name: data.name,
        maxAthletes: data.maxAthletes ?? null,
        logoUrl: data.logoUrl || null,
        streetAddress: data.streetAddress,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode || null,
        timezone: data.timezone || null,
      },
      {
        onSuccess: () => {
          notify(t('clubs:toast.updated'), 'success', uiConfig.toast.durationMs);
          editReset(data);
          setEditingClub(null);
        },
        onError: () =>
          notify(t('errors:club.toast.updateFailed'), 'error', uiConfig.toast.errorDurationMs),
      },
    );
  }

  function handleDeleteEditClub() {
    if (!editingClub) return;
    setConfirmDeleteClub(editingClub);
  }

  function handleDeleteClub(club: Club) {
    setConfirmDeleteClub(club);
  }

  function handleConfirmDeleteClub() {
    if (!confirmDeleteClub) return;
    const target = confirmDeleteClub;
    setConfirmDeleteClub(null);
    deleteClub(target.id, {
      onSuccess: () => {
        notify(
          t('clubs:toast.deleted', { name: target.name }),
          'success',
          uiConfig.toast.durationMs,
        );
        if (editingClub?.id === target.id) setEditingClub(null);
      },
      onError: () =>
        notify(t('errors:club.toast.deleteFailed'), 'error', uiConfig.toast.errorDurationMs),
    });
  }

  // ─── Build grid items (flat — no expandable children; Teams live on their own page) ───────

  const gridItems: AccordionGridParent<Club, never>[] = clubs.map((club) => ({
    id: club.id,
    data: club,
    children: [],
  }));

  // ─── Render helpers ────────────────────────────────────────────────────────

  function renderParent(club: Club) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        {/* Same avatar (logo masking + single-initial fallback) as the club switcher. */}
        <div className="shrink-0" data-testid={`club-logo-${club.id}`}>
          <ClubAvatar logoUrl={club.logoUrl ?? null} name={club.name} variant="on-surface" />
        </div>
        <Typography variant="body-sm" className="truncate font-medium text-text">
          {club.name}
        </Typography>
      </div>
    );
  }

  function renderParentEnd(club: Club) {
    const menuItems: ActionMenuItem[] = [];

    if (canViewTeams) {
      menuItems.push({
        label: t('clubs:teams.manageButton'),
        icon: <ShareWithTeamsIcon aria-hidden="true" />,
        onClick: () => handleManageTeams(club),
      });
    }

    if (canManage) {
      menuItems.push(
        {
          label: t('common:grid.edit'),
          icon: <EditIcon aria-hidden="true" />,
          onClick: () => handleEditClub(club),
        },
        {
          label: t('common:grid.delete'),
          icon: <DeleteIcon aria-hidden="true" />,
          onClick: () => handleDeleteClub(club),
          variant: 'destructive',
        },
      );
    }

    return (
      <>
        {(club.teamCount ?? 0) > 0 &&
          (canViewTeams ? (
            <AppButton
              variant="ghost"
              onClick={() => handleManageTeams(club)}
              aria-label={t('clubs:teams.manageButton')}
              className="h-auto rounded-full p-0 hover:bg-transparent"
            >
              <StatusBadge
                label={t('clubs:teams.count', { count: club.teamCount ?? 0 })}
                icon={ShareWithTeamsIcon}
                variant="info"
              />
            </AppButton>
          ) : (
            <StatusBadge
              label={t('clubs:teams.count', { count: club.teamCount ?? 0 })}
              icon={ShareWithTeamsIcon}
              variant="info"
            />
          ))}
        {(club.activeUserCount ?? 0) > 0 && (
          <StatusBadge label={`${club.activeUserCount} users`} icon={UsersIcon} variant="neutral" />
        )}
        <ActionMenu
          aria-label={`Actions for ${club.name}`}
          items={menuItems}
          buttonProps={
            {
              'data-testid': `club-actions-${club.id}`,
            } as React.ButtonHTMLAttributes<HTMLButtonElement>
          }
        />
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div data-testid="clubs-page">
      {/* Header */}
      <PageHeader
        title={t('clubs:page.title')}
        action={
          canManage && (
            <AppButton onClick={handleOpenAddClub} data-testid="clubs-add-button">
              <AddIcon aria-hidden="true" />
              {t('buttons:new')}
            </AppButton>
          )
        }
      />

      {clubsError && (
        <Banner variant="error" className="mb-md mx-md mt-md">
          {t('errors:genericError')}{' '}
          <button
            type="button"
            className="underline hover:no-underline"
            onClick={() => void refetch()}
          >
            {t('buttons:tryAgain')}
          </button>
        </Banner>
      )}
      <AccordionGrid<Club, never>
        items={gridItems}
        headerLabel={t('clubs:columns.name')}
        renderParent={renderParent}
        renderParentEnd={renderParentEnd}
        renderChild={() => null}
        sortKey={(club) => club.name}
        isLoading={clubsLoading}
        skeletonConfig={{
          rowCount: 6,
          showLeadingVisual: true,
          badgeCount: 2,
          showActions: canManage,
          childRowCount: 0,
        }}
        data-testid="clubs-accordion"
        emptyState={
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UsersIcon className="mb-3 text-text-muted" size={iconSize.lg} />
            <Typography variant="body" className="font-medium text-text">
              {t('clubs:panel.empty')}
            </Typography>
          </div>
        }
      />

      {totalPages > 1 && (
        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          pageSize={pageSize}
          pageSizeOptions={uiConfig.grid.allowedPageSizes}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}

      {/* ── Add club drawer ───────────────────────────────────────────── */}
      <ClubDrawer
        visible={isAddClubOpen}
        onHide={handleCloseAddClub}
        title={t('clubs:popup.addTitle')}
        data-testid="add-club-drawer"
        control={control}
        errors={errors}
        setValue={setValue}
        onSubmit={handleSubmit(handleSubmitCreateClub)}
        isSubmitting={isCreating}
        isSubmitDisabled={!isValid || !hasSeasonDates}
        isDirty={isDirty}
        submitLabel={t('clubs:wizard.createClub')}
        teamsStep
        onRequestSubmit={handleSubmit(handleSubmitCreateClub)}
      />

      {/* ── Create club confirmation ──────────────────────────────────────── */}
      <ConfirmDialog
        visible={isConfirmCreateOpen}
        title={t('clubs:confirm.createTitle')}
        message={t('clubs:confirm.createMessage', { name: pendingCreateData?.name ?? '' })}
        onConfirm={handleConfirmCreate}
        onCancel={handleCancelCreate}
        isLoading={isCreating}
        confirmLabel={t('buttons:createClub')}
      />

      {/* ── Edit club drawer ────────────────────────────────────────────── */}
      <ClubDrawer
        visible={editingClub !== null}
        onHide={() => {
          setEditingClub(null);
          editReset();
        }}
        title={
          <>
            {t('clubs:popup.editTitle')}
            {editingClub?.name && (
              <span className="mt-0.5 block text-sm font-normal text-text-muted leading-tight">
                {editingClub.name}
              </span>
            )}
          </>
        }
        data-testid="edit-club-drawer"
        control={editControl}
        errors={editErrors}
        setValue={editSetValue}
        onSubmit={editHandleSubmit(handleSaveEditClub)}
        isSubmitting={isSavingClub}
        isSubmitDisabled={!editIsValid || !editIsDirty}
        isDirty={editIsDirty}
        submitLabel={t('buttons:saveChanges')}
        currentLogoUrl={editingClub?.logoUrl ?? undefined}
        extraActions={
          canManage ? (
            <AppButton
              variant="outlined"
              className="border-error text-error hover:bg-error/10"
              disabled={isSavingClub}
              onClick={() => handleDeleteEditClub()}
            >
              <DeleteIcon aria-hidden="true" />
              {t('common:grid.delete')}
            </AppButton>
          ) : undefined
        }
      />

      {/* ── Delete club confirmation ──────────────────────────────────── */}
      <ConfirmDialog
        visible={confirmDeleteClub !== null}
        title={t('clubs:confirm.deleteTitle')}
        message={t('clubs:confirm.deleteMessage', { name: confirmDeleteClub?.name ?? '' })}
        onConfirm={handleConfirmDeleteClub}
        onCancel={() => setConfirmDeleteClub(null)}
      />
    </div>
  );
}
