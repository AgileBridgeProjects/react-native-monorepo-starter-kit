'use client';

import { SearchIcon, ShareWithTeamsIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { DeptSharingSummaryFooter } from './dept-sharing-summary-footer';
import { Input } from './input';
import { SelectedDeptChips } from './selected-dept-chips';
import { TeamListRow } from './team-list-row';
import { Typography } from './typography';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TeamSharingState {
  selectedDeptIds: Set<string>;
  search: string;
}

export function defaultTeamSharingState(): TeamSharingState {
  return { selectedDeptIds: new Set(), search: '' };
}

export interface SharableTeam {
  id: string;
  name: string;
  userCount?: number;
}

// ─── TeamSharingStep ───────────────────────────────────────────────────

export interface TeamSharingStepProps {
  state: TeamSharingState;
  onChange: (patch: Partial<TeamSharingState>) => void;
  /** Pre-filtered list of teams to display (filtering is the caller's responsibility). */
  teams: SharableTeam[];
  /** When true, the heading and subtitle are hidden. */
  hideHeading?: boolean;
  /** Heading text — required when hideHeading is not true. */
  heading?: string;
  /** Subtitle text — required when hideHeading is not true. */
  subtitle?: string;
  /** Placeholder text for the search input. */
  searchPlaceholder?: string;
  /** Label for the "select all" row. */
  allTeamsLabel: string;
  /** Description for the "select all" row. */
  allTeamsDescriptionLabel: string;
  /** Returns the employee-count label for a given count. */
  getEmployeeCountLabel: (count: number) => string;
  /** Label showing the number of selected teams. */
  selectedCountLabel: string;
  /** Label for the "clear all" button. */
  clearAllLabel: string;
  /** Label showing the summary dept count. */
  deptsLabel: string;
  /** Label showing the summary employee count. */
  employeesLabel: string;
}

export function TeamSharingStep({
  state,
  onChange,
  teams,
  hideHeading,
  heading,
  subtitle,
  searchPlaceholder,
  allTeamsLabel,
  allTeamsDescriptionLabel,
  getEmployeeCountLabel,
  selectedCountLabel,
  clearAllLabel,
  deptsLabel,
  employeesLabel,
}: TeamSharingStepProps) {
  const isAllSelected = teams.length > 0 && teams.every((d) => state.selectedDeptIds.has(d.id));

  const selectedDepts = teams.filter((d) => state.selectedDeptIds.has(d.id));
  const totalEmployees = selectedDepts.reduce((sum, d) => sum + (d.userCount ?? 0), 0);

  function toggleAll() {
    let nextSelectedDeptIds = new Set(teams.map((d) => d.id));
    if (isAllSelected) {
      nextSelectedDeptIds = new Set();
    }
    onChange({ selectedDeptIds: nextSelectedDeptIds });
  }

  function toggleDept(id: string) {
    const next = new Set(state.selectedDeptIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ selectedDeptIds: next });
  }

  function removeDept(id: string) {
    const next = new Set(state.selectedDeptIds);
    next.delete(id);
    onChange({ selectedDeptIds: next });
  }

  return (
    <div className="flex flex-col gap-md" data-testid="team-sharing-step">
      {!hideHeading && heading && (
        <div>
          <Typography variant="body" className="font-bold">
            {heading}
          </Typography>
          {subtitle && (
            <Typography variant="body-sm" className="mt-0.5 text-text-muted">
              {subtitle}
            </Typography>
          )}
        </div>
      )}

      <Input
        type="text"
        value={state.search}
        onChange={(event) => onChange({ search: event.target.value })}
        placeholder={searchPlaceholder}
        prefix={<SearchIcon size={iconSize.xs} aria-hidden />}
      />

      <SelectedDeptChips
        selectedDepts={selectedDepts}
        totalCount={state.selectedDeptIds.size}
        onRemove={removeDept}
        onClearAll={() => onChange({ selectedDeptIds: new Set() })}
        selectedCountLabel={selectedCountLabel}
        clearAllLabel={clearAllLabel}
      />

      <div className="flex flex-col gap-2">
        <TeamListRow
          isSelected={isAllSelected}
          onClick={toggleAll}
          icon={
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-elevated">
              <ShareWithTeamsIcon size={iconSize.sm} className="text-text-muted" />
            </div>
          }
        >
          <Typography variant="body-sm" className="font-semibold">
            {allTeamsLabel}
          </Typography>
          <Typography variant="caption" className="text-text-muted">
            {allTeamsDescriptionLabel}
          </Typography>
        </TeamListRow>

        {teams.map((dept) => (
          <TeamListRow
            key={dept.id}
            isSelected={state.selectedDeptIds.has(dept.id)}
            onClick={() => toggleDept(dept.id)}
          >
            <Typography variant="body-sm" className="font-semibold">
              {dept.name}
            </Typography>
            <Typography variant="caption" className="text-text-muted">
              {getEmployeeCountLabel(dept.userCount ?? 0)}
            </Typography>
          </TeamListRow>
        ))}
      </div>

      <DeptSharingSummaryFooter
        deptCount={state.selectedDeptIds.size}
        employeeCount={totalEmployees}
        deptsLabel={deptsLabel}
        employeesLabel={employeesLabel}
      />
    </div>
  );
}
