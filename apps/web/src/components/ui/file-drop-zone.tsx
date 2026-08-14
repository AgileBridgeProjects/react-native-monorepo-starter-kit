'use client';

import { useTranslation } from '@lib/i18n';
import { CloseIcon, CloudUploadIcon } from '@starterkit/icons';
import { Button } from './button';
import { DropZone } from './drop-zone';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface FileDropZoneProps {
  /** Called with the selected file. */
  onFile: (file: File) => void;
  /** Accepted MIME types / extensions for the file input (e.g. `"image/*,application/pdf"`). */
  accept?: string;
  /** Whether the zone is disabled (e.g. upload in progress). */
  disabled?: boolean;
  /** Optional hint shown below the button (e.g. "Supports images and PDFs"). */
  hint?: string;
  /** File name to display when a file has been selected / uploaded. */
  fileName?: string;
  /** Called when the user clicks the remove button to clear the selected file. */
  onClear?: () => void;
  /** data-testid for the hidden file input. */
  'data-testid'?: string;
  /** Extra classes merged onto the drop zone (e.g. to override padding). */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FileDropZone({
  onFile,
  accept,
  disabled,
  hint,
  fileName,
  onClear,
  className,
  'data-testid': testId,
}: FileDropZoneProps) {
  const { t } = useTranslation();

  // ── File-selected state ──────────────────────────────────────────────────
  if (fileName) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-3">
        <CloudUploadIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <Typography variant="body-sm" className="min-w-0 flex-1 truncate text-text-primary">
          {fileName}
        </Typography>
        {onClear && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 p-1"
            onClick={onClear}
            aria-label={t('common:actions.remove')}
          >
            <CloseIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // ── Empty drop zone ─────────────────────────────────────────────────────
  return (
    <DropZone
      onFile={onFile}
      accept={accept}
      disabled={disabled}
      hint={hint}
      className={className}
      inputTestId={testId}
    />
  );
}
