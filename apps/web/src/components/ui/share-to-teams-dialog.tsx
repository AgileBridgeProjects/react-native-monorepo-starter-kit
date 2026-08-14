'use client';

import { uiConfig } from '@lib/ui-config';
import TagBox from 'devextreme-react/tag-box';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import { EntityFormShell } from '@/components/ui/entity-form-shell';
import { FormField } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { Typography } from '@/components/ui/typography';
import { useTeamSelectStore } from '@/lib/hooks';
import { notify } from './toast';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShareToTeamsLabels {
  title: string;
  editTitle: string;
  submitButton: string;
  editButton: string;
  teamsLabel: string;
  teamsPlaceholder: string;
  teamsRequired: string;
  toastSharing: string;
  toastShared: string;
  toastUpdated: string;
  toastShareFailed: string;
  toastUpdateFailed: string;
}

export interface ShareToTeamsDialogProps {
  /** Unique entity ID (used as TagBox key for proper reset). */
  entityId: string;
  /** Display name shown as read-only context above the team picker. */
  entityName: string;
  /** Club ID for the team store. */
  clubId: string | null | undefined;
  /** Current team assignments (from a query hook). */
  assignments: { teamId?: string }[] | undefined;
  /** Whether the assignments query has finished loading. */
  assignmentsLoaded: boolean;
  /** Whether the mutation is in progress. */
  isPending: boolean;
  /**
   * Team IDs to pre-select when there are no existing assignments.
   * Typically set to the currently selected workspace team.
   */
  defaultDeptIds?: string[];
  /** Translation keys / pre-translated labels for the dialog. */
  labels: ShareToTeamsLabels;
  /** Test ID prefix, e.g. "share-game" or "share-topic". */
  testIdPrefix: string;
  /** Called with selected team IDs when the form is submitted. */
  onSubmit: (newDeptIds: string[], previousDeptIds: string[]) => void;
  /** Called when the dialog is closed/cancelled. */
  onHide: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ShareToTeamsDialog({
  entityId,
  entityName,
  clubId,
  assignments,
  assignmentsLoaded,
  isPending,
  labels,
  testIdPrefix,
  defaultDeptIds,
  onSubmit,
  onHide,
}: ShareToTeamsDialogProps) {
  const [deptError, setDeptError] = useState<string | null>(null);
  const selectedDeptIdsRef = useRef<string[]>([]);

  const deptStore = useTeamSelectStore(clubId);

  const previousDeptIds = useMemo(
    () => (assignments ?? []).map((a) => a.teamId as string).filter(Boolean),
    [assignments],
  );
  const isEdit = previousDeptIds.length > 0;

  // Compute initial selected IDs: prefer existing assignments, fall back to workspace default.
  // Use a ref so it captures the first-render values without triggering re-computation on each render.
  const initialDeptIdsRef = useRef<string[] | null>(null);
  if (initialDeptIdsRef.current === null) {
    initialDeptIdsRef.current =
      previousDeptIds.length > 0 ? previousDeptIds : (defaultDeptIds ?? []);
  }
  const initialDeptIds = initialDeptIdsRef.current;

  useEffect(() => {
    if (assignmentsLoaded && selectedDeptIdsRef.current.length === 0) {
      selectedDeptIdsRef.current =
        previousDeptIds.length > 0 ? previousDeptIds : (defaultDeptIds ?? []);
    }
  }, [assignmentsLoaded, previousDeptIds, defaultDeptIds]);

  function handleHide() {
    selectedDeptIdsRef.current = [];
    setDeptError(null);
    onHide();
  }

  function handleSubmit() {
    const newDeptIds = selectedDeptIdsRef.current;
    if (newDeptIds.length === 0) {
      setDeptError(labels.teamsRequired);
      return;
    }

    setDeptError(null);
    notify(labels.toastSharing, 'info', uiConfig.toast.durationMs);
    onSubmit(newDeptIds, previousDeptIds);
  }

  const fieldId = `${testIdPrefix}-teams`;

  return (
    <DrawerPanel
      visible
      onHide={handleHide}
      title={isEdit ? labels.editTitle : labels.title}
      data-testid={`${testIdPrefix}-dialog`}
    >
      <EntityFormShell
        onSubmit={handleSubmit}
        onCancel={handleHide}
        isSubmitting={isPending}
        isSubmitDisabled={!assignmentsLoaded}
        submitLabel={isEdit ? labels.editButton : labels.submitButton}
        submitButtonTestId={`${testIdPrefix}-submit-button`}
        className="border-0 bg-transparent p-0 shadow-none"
      >
        <Typography variant="body-sm" className="mb-4 font-semibold text-text-muted">
          {entityName}
        </Typography>

        <FormField
          label={labels.teamsLabel}
          htmlFor={fieldId}
          required
          error={deptError ?? undefined}
        >
          {!assignmentsLoaded && <Skeleton className="h-9 w-full rounded" />}
          {assignmentsLoaded && (
            <TagBox
              key={entityId}
              inputAttr={{
                id: fieldId,
                'data-testid': `${testIdPrefix}-teams-tagbox`,
              }}
              disabled={deptStore === undefined}
              dataSource={deptStore}
              displayExpr="name"
              valueExpr="id"
              defaultValue={initialDeptIds}
              onValueChanged={(e) => {
                selectedDeptIdsRef.current = e.value ?? [];
                if (e.value?.length > 0) setDeptError(null);
              }}
              placeholder={labels.teamsPlaceholder}
              searchEnabled
              searchExpr="name"
              searchTimeout={uiConfig.selectSearch.searchTimeout}
              minSearchLength={uiConfig.selectSearch.minSearchLength}
              showSelectionControls
              applyValueMode="useButtons"
              showDropDownButton
              stylingMode="outlined"
              dropDownOptions={{ container: 'body' }}
            />
          )}
        </FormField>
      </EntityFormShell>
    </DrawerPanel>
  );
}
