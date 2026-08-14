'use client';

import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { CloseIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import type { ValueChangedEvent } from 'devextreme/ui/select_box';
import SelectBox from 'devextreme-react/select-box';
import { useTeamCount } from '@/lib/hooks/use-team-count';
import { useTeamSelectStore } from '@/lib/hooks/use-team-select-store';
import { useWorkspaceStore } from '@/store/workspace-store';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Team SelectBox scoped to the currently-selected club.
 * Rendered inside the sidebar below the club trigger.
 */
export function TeamSelector() {
  const { t } = useTranslation();
  const { clubId, clubName, clubLogoUrl, teamId, setClub, setWorkspace } = useWorkspaceStore();

  // Build the canonical WorkspaceClubSummary from store state.
  // Defined inline here (not extracted to a selector) so it picks up the
  // latest store values on each render without subscribing twice.
  const buildSummary = () => {
    if (!clubId || !clubName) return null;
    return {
      id: clubId,
      name: clubName,
      logoUrl: clubLogoUrl,
    };
  };

  // Team count — pre-fetched when club changes so placeholder is correct immediately
  const { data: teamsInitial } = useTeamCount(clubId, uiConfig.grid.flyoutPageSize);
  const teamCount = Number(teamsInitial?.totalCount ?? 0);

  // Team store — backend-searched, scoped to selected club
  const teamStore = useTeamSelectStore(clubId ?? undefined);

  async function handleTeamChange(e: ValueChangedEvent) {
    const summary = buildSummary();
    if (!summary) return;
    if (!e.value) {
      setClub(summary);
      return;
    }
    const teamId = e.value as string;
    const team = await teamStore?.store().byKey(teamId);
    if (team?.id && team.name) {
      setWorkspace(summary, { id: team.id, name: team.name });
    }
  }

  function clearTeam() {
    const summary = buildSummary();
    if (!summary) return;
    setClub(summary);
  }

  const content = clubId ? (
    <div className="flex items-center gap-sm">
      <div className="min-w-0 flex-1">
        <SelectBox
          dataSource={teamStore}
          valueExpr="id"
          displayExpr="name"
          value={teamId}
          onValueChanged={handleTeamChange}
          searchEnabled
          searchExpr="name"
          searchTimeout={uiConfig.selectSearch.searchTimeout}
          minSearchLength={0}
          showClearButton={false}
          placeholder={t('workspace:switcher.searchTeams', { count: teamCount })}
          inputAttr={{
            'aria-label': t('workspace:switcher.searchTeams', {
              count: teamCount,
            }),
          }}
          elementAttr={{ 'data-testid': 'team-switcher', class: 'dx-on-primary' }}
          dropDownOptions={{ wrapperAttr: { class: 'team-dropdown-popup' }, maxHeight: 280 }}
          width="100%"
        />
      </div>
      {/* Raw <button> required: 16px icon toggle on dark sidebar surface — DX Button cannot be themed to match */}
      {teamId && (
        <button
          type="button"
          onClick={clearTeam}
          className="flex shrink-0 items-center justify-center rounded p-0.5 text-on-primary-subtle transition-colors hover:text-on-primary-muted"
          aria-label={t('workspace:switcher.clearTeam')}
        >
          <CloseIcon size={iconSize.xs} aria-hidden="true" />
        </button>
      )}
    </div>
  ) : (
    <div className="flex h-8 items-center rounded-md bg-on-primary-surface px-sm text-xs text-on-primary-subtle">
      {t('workspace:switcher.selectClubFirst')}
    </div>
  );

  // Fixed height matches the collapsed-rail team icon button so the sidebar
  // header keeps a constant height across collapse/expand and the nav doesn't shift.
  return (
    <div className="flex h-16 flex-col justify-center border-t border-on-primary-overlay px-md">
      {content}
    </div>
  );
}
