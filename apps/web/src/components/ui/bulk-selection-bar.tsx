'use client';

import { BlockIcon, CheckIcon, CloseIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { Button } from './button';
import { Typography } from './typography';

export interface BulkSelectionBarProps {
  selectedCountLabel: string;
  activateLabel: string;
  deactivateLabel: string;
  clearLabel: string;
  onActivate: () => void;
  onDeactivate: () => void;
  onClear: () => void;
  activateTestId?: string;
  deactivateTestId?: string;
  clearTestId?: string;
}

export function BulkSelectionBar({
  selectedCountLabel,
  activateLabel,
  deactivateLabel,
  clearLabel,
  onActivate,
  onDeactivate,
  onClear,
  activateTestId,
  deactivateTestId,
  clearTestId,
}: BulkSelectionBarProps) {
  return (
    <div className="flex items-center gap-md border-b border-border bg-primary/[0.04] px-md py-sm">
      <div className="flex shrink-0 items-center gap-sm">
        <Typography variant="body-sm" className="font-semibold text-text">
          {selectedCountLabel}
        </Typography>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-text-muted hover:text-text"
          data-testid={clearTestId}
        >
          <CloseIcon size={iconSize.sm} />
          {clearLabel}
        </Button>
      </div>

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={onActivate}
          className="text-success hover:bg-success/10"
          data-testid={activateTestId}
        >
          <CheckIcon size={iconSize.sm} />
          {activateLabel}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeactivate}
          className="text-error hover:bg-error/10"
          data-testid={deactivateTestId}
        >
          <BlockIcon size={iconSize.sm} />
          {deactivateLabel}
        </Button>
      </div>
    </div>
  );
}
