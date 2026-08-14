'use client';

import { useCurrentSession } from '@features/auth/presentation/hooks/use-current-session';
import type { Team } from '@features/clubs/domain/entities/team';
import { createTeamStore } from '@features/clubs/infrastructure/datasources/team-datasource';
import { TeamDialog } from '@features/clubs/presentation/components/team-dialog';
import { useCurrentSeason } from '@features/clubs/presentation/hooks/use-current-season';
import { useDeleteTeam } from '@features/clubs/presentation/hooks/use-delete-team';
import { ClubAvatar } from '@features/workspace/presentation/components/club-avatar';
import { useEffectiveClubId } from '@features/workspace/presentation/hooks/use-effective-club-id';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { ShareWithTeamsIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { useMemo, useState } from 'react';
import {
  type ColumnDef,
  ConfirmDialog,
  EntityDataGrid,
  NewButton,
  notify,
  PageHeader,
  Typography,
} from '@/components/ui';
import { useWorkspaceStore } from '@/store/workspace-store';

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Independent Teams page — scoped to whichever club is currently selected
 * in the nav workspace switcher, rather than nested under the Super-Admin-only Clubs page.
 * This is what gives Club Managers (who don't have `StarterKit.Clubs.Manage`) a way to manage
 * their own club's teams and seasons.
 */
export function TeamsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useCurrentSession();
  const canManage = hasPermission('StarterKit.Teams.Manage');

  const { clubId: selectedClubId, clubName: selectedClubName } = useWorkspaceStore();
  const effectiveClubId = useEffectiveClubId(selectedClubId);

  // Teams always scope to the club's current active season — no manual season picker. Full
  // season management (browsing/filtering by past seasons) is deferred to a future redesign.
  const { data: currentSeason, isLoading: isSeasonLoading } = useCurrentSeason(
    effectiveClubId ?? null,
  );

  // Create the store as soon as the club is known — even before the season resolves — so
  // EntityDataGrid's isLoading prop (driven by isSeasonLoading below) shows a real skeleton
  // instead of rendering nothing while the active season is still being fetched.
  const store = useMemo(
    () => (effectiveClubId ? createTeamStore(effectiveClubId, currentSeason?.id) : null),
    [effectiveClubId, currentSeason?.id],
  );

  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<Team | null>(null);

  const { mutate: deleteTeam, isPending: isDeletingTeam } = useDeleteTeam();

  function handleConfirmDeleteTeam() {
    if (!confirmDeleteTeam) return;
    const target = confirmDeleteTeam;
    setConfirmDeleteTeam(null);
    deleteTeam(target.id, {
      onSuccess: () => {
        notify(
          t('clubs:teams.toast.deleted', { name: target.name }),
          'success',
          uiConfig.toast.durationMs,
        );
        store?.reload();
      },
      onError: () =>
        notify(t('clubs:teams.toast.deleteFailed'), 'error', uiConfig.toast.errorDurationMs),
    });
  }

  const columns: ColumnDef<Team>[] = [
    {
      dataField: 'name',
      caption: t('clubs:teams.form.name.label'),
      allowSorting: true,
      minWidth: 180,
      cellRender: ({ data: team }) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <ClubAvatar logoUrl={team.logoUrl ?? null} name={team.name} size="sm" />
          <Typography variant="body-sm" as="span" className="truncate font-medium">
            {team.name}
          </Typography>
        </div>
      ),
    },
    { dataField: 'ageGroup', caption: t('clubs:teams.form.ageGroup.label') },
    { dataField: 'description', caption: t('clubs:teams.form.description.label') },
  ];

  if (!effectiveClubId) {
    return (
      <div data-testid="teams-page">
        <PageHeader title={t('nav:teams')} />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShareWithTeamsIcon className="mb-3 text-text-muted" size={iconSize.lg} />
          <Typography variant="body" className="font-medium text-text">
            {t('clubs:teams.noClubSelected')}
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="teams-page">
      <PageHeader
        title={t('nav:teams')}
        subtitle={selectedClubName ?? undefined}
        action={
          canManage && (
            <NewButton onClick={() => setIsAddTeamOpen(true)} data-testid="teams-add-button" />
          )
        }
      />

      {store && (
        <EntityDataGrid<Team>
          dataSource={store}
          columns={columns}
          isLoading={isSeasonLoading}
          onEdit={canManage ? (team) => setEditingTeam(team) : undefined}
          onDelete={canManage ? (team) => setConfirmDeleteTeam(team) : undefined}
          emptyStateIcon={<ShareWithTeamsIcon size={iconSize.md} className="text-text-muted" />}
          data-testid="teams-grid"
        />
      )}

      {/* ── Add / edit team popup ──────────────────────────────────── */}
      <TeamDialog
        clubId={effectiveClubId}
        team={editingTeam}
        visible={isAddTeamOpen || editingTeam !== null}
        onHide={() => {
          setIsAddTeamOpen(false);
          setEditingTeam(null);
        }}
        onCreated={() => store?.reload()}
        onUpdated={() => store?.reload()}
      />

      {/* ── Delete team confirmation ───────────────────────────────── */}
      <ConfirmDialog
        visible={confirmDeleteTeam !== null}
        title={t('clubs:teams.confirm.deleteTitle')}
        message={t('clubs:teams.confirm.deleteMessage', {
          name: confirmDeleteTeam?.name ?? '',
        })}
        onConfirm={handleConfirmDeleteTeam}
        onCancel={() => setConfirmDeleteTeam(null)}
        isLoading={isDeletingTeam}
      />
    </div>
  );
}
