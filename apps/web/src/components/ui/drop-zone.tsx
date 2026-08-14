'use client';

import { useTranslation } from '@lib/i18n';
import { CloudUploadIcon, DeleteIcon, PdfIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';
import { Button } from './button';
import { FieldError } from './field-error';
import { ProcessingStatus } from './processing-status';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface DropZoneProps {
  /** Called with the selected file. */
  onFile: (file: File) => void;
  /** Accepted MIME types / extensions for the file input (e.g. `"image/*,application/pdf"`). */
  accept?: string;
  /** Whether the zone is disabled (e.g. upload in progress). */
  disabled?: boolean;
  /** Optional hint shown below the button (e.g. "Supports images and PDFs"). */
  hint?: string;
  /** Custom label for the button. Defaults to common:actions.chooseFile. */
  buttonLabel?: string;
  /** Show a loading spinner on the button. */
  isLoading?: boolean;
  /** Label shown over the preview while processing the selected file. */
  processingLabel?: string;
  /** Latest server-authored status message shown while processing the selected file. */
  processingMessage?: string;
  /** aria-label for the hidden file input. Falls back to the button label. */
  inputAriaLabel?: string;
  /** data-testid for the hidden file input. */
  inputTestId?: string;
  /** data-testid for the button. */
  buttonTestId?: string;
  /** HTML id for the hidden file input (useful for linking with external labels). */
  inputId?: string;
  /** Validation error message shown below the drop zone. */
  error?: string;
  /** URL of an image/file to show as a full-component preview once uploaded. */
  previewUrl?: string;
  /** Alt text for the preview image. */
  previewAlt?: string;
  /** MIME type of the uploaded file — used to distinguish image vs PDF preview. */
  previewMimeType?: string;
  /** Called when the user clicks the trash icon on the preview. */
  onRemove?: () => void;
  /**
   * Render the image preview on a transparency checkerboard instead of a solid surface.
   * Use for images where transparency is meaningful (e.g. logos with the background removed),
   * so a removed background is visually obvious rather than blending into a white surface.
   */
  checkeredPreview?: boolean;
  /** Extra classes merged onto the outer drop-zone div (e.g. to override padding). */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DropZone({
  onFile,
  accept,
  disabled,
  hint,
  className,
  buttonLabel,
  isLoading,
  processingLabel,
  processingMessage,
  inputAriaLabel,
  inputTestId,
  buttonTestId,
  inputId,
  error,
  previewUrl,
  previewAlt,
  previewMimeType,
  onRemove,
  checkeredPreview,
}: DropZoneProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onFile(file);
    e.target.value = '';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    onFile(file);
  }

  const resolvedButtonLabel =
    buttonLabel ?? (disabled ? t('common:actions.uploading') : t('common:actions.chooseFile'));

  const isPdf =
    previewMimeType === 'application/pdf' ||
    (!previewMimeType && typeof previewUrl === 'string' && previewUrl.endsWith('.pdf'));
  const showProcessingOverlay = Boolean(previewUrl && isLoading && processingLabel);

  // ── Preview state — replaces the entire drop zone ────────────────────────
  if (previewUrl) {
    return (
      <>
        <div
          className={cn(
            'group relative overflow-hidden rounded-lg border border-border',
            showProcessingOverlay && 'cursor-wait border-primary/60 ring-2 ring-primary/20',
            disabled && !showProcessingOverlay && 'pointer-events-none opacity-60',
          )}
        >
          {isPdf ? (
            /* PDF card preview */
            <div className="flex min-h-35 flex-col items-center justify-center gap-2 bg-surface-elevated px-4 py-6">
              <PdfIcon size={iconSize.lg} className="text-danger" aria-hidden="true" />
              <Typography variant="body-sm" className="max-w-full truncate text-text-secondary">
                {previewAlt ?? 'PDF document'}
              </Typography>
            </div>
          ) : (
            /* Image preview */
            <div
              className={cn(
                'relative min-h-35 w-full',
                checkeredPreview ? 'checkerboard-surface' : 'bg-surface-elevated',
              )}
            >
              <Image
                src={previewUrl}
                alt={previewAlt ?? ''}
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          )}

          <ProcessingStatus
            isActive={showProcessingOverlay}
            label={processingLabel}
            message={processingMessage}
            showOverlay
            showStatus={false}
          />

          {/* Hover overlay with trash */}
          {onRemove && !disabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                aria-label={t('common:actions.remove')}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <DeleteIcon size={iconSize.md} aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
        <ProcessingStatus
          isActive={showProcessingOverlay}
          label={processingLabel}
          message={processingMessage}
        />
        <FieldError message={error} className="mt-1" />
      </>
    );
  }

  // ── Shared hidden input ───────────────────────────────────────────────────
  const fileInput = (
    <input
      ref={fileInputRef}
      id={inputId}
      type="file"
      accept={accept}
      disabled={disabled}
      onChange={handleChange}
      className="hidden"
      aria-label={inputAriaLabel ?? resolvedButtonLabel}
      data-testid={inputTestId}
    />
  );

  const sharedZoneProps = {
    role: 'button' as const,
    tabIndex: 0,
    onClick: handleClick,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    'aria-disabled': disabled,
  };

  const borderColor = isDragOver
    ? 'border-primary bg-primary/5'
    : error
      ? 'border-error bg-error/5'
      : 'border-border bg-surface-elevated hover:border-text-muted';

  // ── Centered vertical stack ──────────────────────────────────────────────
  return (
    <>
      <div
        {...sharedZoneProps}
        className={cn(
          'flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition-colors',
          className,
          borderColor,
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <CloudUploadIcon size={iconSize.md} className="text-text-muted" aria-hidden="true" />
        <Typography variant="body-sm" className="text-text-secondary">
          {t('common:actions.dragAndDrop')}
        </Typography>
        <Typography variant="caption" className="text-text-muted">
          {t('common:actions.or')}
        </Typography>
        <Button
          type="button"
          variant="outlined"
          size="sm"
          isLoading={isLoading}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          data-testid={buttonTestId}
        >
          {resolvedButtonLabel}
        </Button>
        {hint && (
          <Typography variant="caption" className="text-center text-text-muted">
            {hint}
          </Typography>
        )}
        {fileInput}
      </div>
      <FieldError message={error} className="mt-1" />
    </>
  );
}
