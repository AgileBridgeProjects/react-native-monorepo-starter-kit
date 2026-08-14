'use client';

import { useCurrentSession } from '@features/auth/presentation/hooks/use-current-session';
import type { WorkspaceClubSummary } from '@features/workspace/domain/types/workspace-club-summary';
import { useTranslation } from '@lib/i18n';
import { ClubsIcon, ShareWithTeamsIcon, UnfoldMoreIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { useUiStore } from '@/store/ui-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { ClubAvatar } from './club-avatar';
import { ClubFlyout } from './club-flyout';
import { TeamSelector } from './team-selector';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Sidebar workspace header.
 *
 * SuperAdmins: interactive — click to open a club flyout and switch workspace.
 * Non-super-admins: read-only — shows their club name and logo with no interaction.
 * Club info is pre-populated from the /api/auth/me response by PortalRoleGuard on
 * sign-in. The AI credit meter sits at the foot of this workspace block, grouped with
 * the club/team context it belongs to.
 */
interface WorkspaceSwitcherProps {
  /** Icon-only rail mode — shows just the club avatar. */
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed = false }: WorkspaceSwitcherProps) {
  const { t } = useTranslation();
  const { clubId, clubName, clubLogoUrl, teamName, setClub } = useWorkspaceStore();

  const { hasPermission } = useCurrentSession();
  const isSuperAdmin = hasPermission('StarterKit.Platform.Admin');
  const expandSidebar = useUiStore((s) => s.setSidebarCollapsed);

  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function handleClubSelect(club: WorkspaceClubSummary) {
    setClub(club);
    setFlyoutOpen(false);
  }

  // ── Read-only display for non-super-admins ──────────────────────────────────
  if (!isSuperAdmin) {
    const teamLabel = teamName ?? t('workspace:switcher.selectTeam');
    const collapsedTeamButton = (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => expandSidebar(false)}
        className="h-16 w-full rounded-none border-t border-on-primary-overlay px-2 text-on-primary-subtle hover:bg-on-primary-overlay hover:text-on-primary"
        title={teamLabel}
        aria-label={teamLabel}
      >
        <ShareWithTeamsIcon size={iconSize.sm} aria-hidden="true" aria-label={undefined} />
      </Button>
    );

    const teamSlot = collapsed ? collapsedTeamButton : <TeamSelector />;

    return (
      <div className="shrink-0 border-b border-on-primary-overlay">
        <div
          className={cn(
            'flex h-20 w-full items-center',
            collapsed ? 'justify-center px-2' : 'justify-center px-md',
          )}
        >
          {clubName ? (
            <ClubAvatar
              logoUrl={clubLogoUrl}
              name={clubName}
              size={collapsed ? 'md' : 'wide'}
              variant="on-primary"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-on-primary-surface-hover">
              <ClubsIcon
                size={iconSize.sm}
                className="text-on-primary-hover"
                aria-label={undefined}
              />
            </div>
          )}
        </div>
        {teamSlot}
      </div>
    );
  }

  // ── Interactive switcher for super-admins ───────────────────────────────────

  const clubAvatar = clubId ? (
    <ClubAvatar logoUrl={clubLogoUrl} name={clubName ?? ''} size="wide" variant="on-primary" />
  ) : (
    <div className="flex items-center gap-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-on-primary-surface-hover">
        <ClubsIcon size={iconSize.sm} className="text-on-primary-hover" aria-label={undefined} />
      </div>
      <Typography variant="body-sm" as="span" className="text-on-primary-subtle">
        {t('workspace:switcher.selectWorkspace')}
      </Typography>
    </div>
  );

  const clubLabel = clubId ? clubName : t('workspace:switcher.selectWorkspace');

  const collapsedAvatarContent = clubId ? (
    <ClubAvatar logoUrl={clubLogoUrl} name={clubName ?? ''} size="md" variant="on-primary" />
  ) : (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-on-primary-surface-hover">
      <ClubsIcon size={iconSize.sm} className="text-on-primary-hover" aria-label={undefined} />
    </div>
  );

  // ── Collapsed rail: avatar-only trigger, flyout still available ──────────────
  if (collapsed) {
    return (
      <div className="relative shrink-0 border-b border-on-primary-overlay">
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          onClick={() => setFlyoutOpen((v) => !v)}
          className="flex h-20 w-full items-center justify-center rounded-none px-2 hover:bg-on-primary-overlay"
          aria-haspopup="listbox"
          aria-expanded={flyoutOpen}
          aria-label={clubLabel ?? t('workspace:switcher.selectWorkspace')}
          data-testid="club-selector"
        >
          {collapsedAvatarContent}
        </Button>

        {/* AI credit meter — sits directly under the club logo */}

        {/* Team slot stand-in — kept at the same height as the expanded
            team selector so collapsing shrinks rather than restructures the
            header. Clicking expands the sidebar to reveal the full selector. */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => expandSidebar(false)}
          className="h-16 w-full rounded-none border-t border-on-primary-overlay px-2 text-on-primary-subtle hover:bg-on-primary-overlay hover:text-on-primary"
          title={teamName ?? t('workspace:switcher.selectTeam')}
          aria-label={teamName ?? t('workspace:switcher.selectTeam')}
        >
          <ShareWithTeamsIcon size={iconSize.sm} aria-hidden="true" aria-label={undefined} />
        </Button>

        {flyoutOpen && (
          <ClubFlyout
            selectedClubId={clubId}
            triggerRef={triggerRef}
            onSelect={handleClubSelect}
            onClose={() => setFlyoutOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative shrink-0 border-b border-on-primary-overlay">
      {/* ── Club selector button ─────────────────────────────────────── */}
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        onClick={() => setFlyoutOpen((v) => !v)}
        className="grid h-20 w-full grid-cols-[1fr_auto_1fr] items-center rounded-none px-md hover:bg-on-primary-overlay"
        aria-haspopup="listbox"
        aria-expanded={flyoutOpen}
        aria-label={clubLabel ?? t('workspace:switcher.selectWorkspace')}
        data-testid="club-selector"
      >
        <span className="col-start-2">{clubAvatar}</span>
        <UnfoldMoreIcon
          size={iconSize.sm}
          aria-hidden="true"
          aria-label={undefined}
          className="col-start-3 ms-md justify-self-start text-on-primary-subtle"
        />
      </Button>

      {/* ── AI credit meter — sits directly under the club logo ────────── */}

      {/* ── Team dropdown ────────────────────────────────────────────────── */}
      <TeamSelector />

      {/* ── Club flyout panel — opens to the RIGHT of the sidebar ────── */}
      {flyoutOpen && (
        <ClubFlyout
          selectedClubId={clubId}
          triggerRef={triggerRef}
          onSelect={handleClubSelect}
          onClose={() => setFlyoutOpen(false)}
        />
      )}
    </div>
  );
}
