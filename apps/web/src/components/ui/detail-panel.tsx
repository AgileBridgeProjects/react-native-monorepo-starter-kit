'use client';

import type { ReactNode } from 'react';
import { Button } from './button';
import { Typography } from './typography';

// ─── DetailPanel ─────────────────────────────────────────────────────────────

export interface DetailPanelProps {
  /** Scrollable body content. */
  children: ReactNode;
  /** Pinned footer rendered below the body. */
  footer: ReactNode;
  'data-testid'?: string;
}

/**
 * Full-height master–detail edit shell: scrollable body that flexes to fill available
 * height, with a border-separated footer pinned at the bottom.
 */
export function DetailPanel({ children, footer, 'data-testid': testId }: DetailPanelProps) {
  return (
    <div data-testid={testId} className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-sm overflow-y-auto px-lg py-md">
        {children}
      </div>
      <div className="shrink-0 border-t border-border">{footer}</div>
    </div>
  );
}

// ─── DetailPanelFooter ───────────────────────────────────────────────────────

export interface DetailPanelFooterProps {
  /** Shows the unsaved-changes dot + label when true. */
  isDirty?: boolean;
  /** Text shown beside the warning dot when dirty. */
  unsavedLabel?: string;
  /** Disables the Save button when false. */
  canSave?: boolean;
  cancelLabel: string;
  saveLabel: string;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: () => void;
  /** Forwarded to the Save button for test selection. */
  saveTestId?: string;
}

export function DetailPanelFooter({
  isDirty,
  unsavedLabel,
  canSave = true,
  cancelLabel,
  saveLabel,
  isSaving,
  onCancel,
  onSave,
  saveTestId,
}: DetailPanelFooterProps) {
  return (
    <div className="flex items-center justify-between gap-md px-lg py-sm">
      <div className="min-w-0">
        {isDirty && unsavedLabel && (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
            <Typography variant="caption" className="text-text-muted">
              {unsavedLabel}
            </Typography>
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-sm">
        <Button type="button" variant="outlined" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onSave}
          disabled={!canSave}
          isLoading={isSaving}
          data-testid={saveTestId}
        >
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
