'use client';

import { isBrowserRenderableUrl } from '@lib/url-utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DropZone } from './drop-zone';
import { FormField } from './form-field';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ImageUploadFieldProps {
  /** Label shown above the field. */
  label: string;
  /** Unique id for the hidden file input — links to the label via `htmlFor`. */
  id: string;
  /** Whether an upload is currently in progress. */
  isUploading: boolean;
  /** URL of the previously-uploaded image (server URL or object URL). */
  previewUrl?: string;
  /** Called with the selected file when the user picks one. */
  onChange: (file: File) => void;
  /** Called when the user clicks "Remove" — parent should clear the URL from form state. */
  onRemove?: () => void;
  /** Accepted MIME types for the file input (e.g. `"image/png,image/jpeg"`). */
  accept?: string;
  /** Helper text shown below the field. Suppressed when `error` is set. */
  hint?: string;
  /** Alt text for the preview image. */
  previewAlt?: string;
  /** Validation error message shown below the field. */
  error?: string;
  /** Disables the field without implying an upload is in progress. */
  disabled?: boolean;
  /** Label shown over the preview while the selected image is being processed. */
  processingLabel?: string;
  /** Latest server-authored status message shown while processing the selected image. */
  processingMessage?: string;
  /**
   * Render the preview on a transparency checkerboard. Use for images where a transparent
   * background is meaningful (e.g. logos), so the removed background is visible rather than
   * blending into a white surface.
   */
  checkeredPreview?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ImageUploadField({
  label,
  id,
  isUploading,
  previewUrl,
  onChange,
  onRemove,
  accept = 'image/*',
  hint,
  previewAlt,
  error,
  disabled,
  processingLabel,
  processingMessage,
  checkeredPreview,
}: ImageUploadFieldProps) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [localMimeType, setLocalMimeType] = useState<string | null>(null);
  const localPreviewRef = useRef<string | null>(null);

  // Revoke object URL on unmount to prevent memory leaks.
  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    };
  }, []);

  // When the parent clears previewUrl (e.g. after form reset / submission), also clear the
  // local object-URL so the drop zone returns to its empty state rather than showing a stale image.
  useEffect(() => {
    if (!previewUrl) {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
      setLocalPreview(null);
      setLocalMimeType(null);
    }
  }, [previewUrl]);

  const processFile = useCallback(
    (file: File) => {
      // Revoke any previous object URL before creating a new one.
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
      const objectUrl = URL.createObjectURL(file);
      localPreviewRef.current = objectUrl;
      setLocalPreview(objectUrl);
      setLocalMimeType(file.type);
      onChange(file);
    },
    [onChange],
  );

  function handleRemove() {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = null;
    setLocalPreview(null);
    setLocalMimeType(null);
    onRemove?.();
  }

  const displayPreview = isBrowserRenderableUrl(previewUrl) ? previewUrl : localPreview;

  // Infer mime type: use tracked local type, or detect from a server URL (blob or .pdf suffix).
  const displayMimeType =
    localMimeType ??
    (typeof previewUrl === 'string' && previewUrl.endsWith('.pdf') ? 'application/pdf' : undefined);

  return (
    <FormField label={label} htmlFor={id} error={error}>
      <DropZone
        onFile={processFile}
        accept={accept}
        disabled={isUploading || disabled}
        isLoading={isUploading}
        processingLabel={processingLabel}
        processingMessage={processingMessage}
        hint={hint}
        inputId={id}
        inputAriaLabel={label}
        previewUrl={displayPreview ?? undefined}
        previewAlt={previewAlt ?? label}
        previewMimeType={displayMimeType ?? undefined}
        onRemove={onRemove ? handleRemove : undefined}
        checkeredPreview={checkeredPreview}
      />
    </FormField>
  );
}
