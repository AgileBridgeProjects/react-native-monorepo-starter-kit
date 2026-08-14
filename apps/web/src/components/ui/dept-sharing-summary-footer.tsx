'use client';

import { ShareWithTeamsIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { Typography } from './typography';

export interface DeptSharingSummaryFooterProps {
  deptCount: number;
  employeeCount: number;
  deptsLabel: string;
  employeesLabel: string;
}

export function DeptSharingSummaryFooter({
  deptCount,
  employeeCount,
  deptsLabel,
  employeesLabel,
}: DeptSharingSummaryFooterProps) {
  if (deptCount === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-md py-sm">
      <ShareWithTeamsIcon size={iconSize.sm} className="shrink-0 text-text-muted" />
      <Typography variant="body-sm">
        <span className="font-semibold">{deptsLabel}</span>
        {employeeCount > 0 && employeesLabel}
      </Typography>
    </div>
  );
}
