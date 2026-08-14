'use client';

import { Button } from './button';
import type { SharableTeam } from './team-sharing-step';
import { Typography } from './typography';

export interface SelectedDeptChipsProps {
  selectedDepts: SharableTeam[];
  totalCount: number;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  selectedCountLabel: string;
  clearAllLabel: string;
}

export function SelectedDeptChips({
  selectedDepts,
  totalCount,
  onRemove,
  onClearAll,
  selectedCountLabel,
  clearAllLabel,
}: SelectedDeptChipsProps) {
  if (totalCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-sm py-xs">
      <Typography variant="caption" className="shrink-0 font-semibold text-text-muted">
        {selectedCountLabel}
      </Typography>
      {selectedDepts.map((d) => (
        <Button
          key={d.id}
          type="button"
          variant="ghost"
          onClick={() => onRemove(d.id)}
          className="h-auto flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-sm py-0.5 text-xs hover:border-danger/40 hover:bg-danger/5"
        >
          <span>{d.name}</span>
          <span className="text-text-muted" aria-hidden>
            ×
          </span>
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        onClick={onClearAll}
        className="ml-auto h-auto shrink-0 px-0 py-0 text-xs text-text-muted underline-offset-2 hover:bg-transparent hover:text-text hover:underline"
      >
        {clearAllLabel}
      </Button>
    </div>
  );
}
