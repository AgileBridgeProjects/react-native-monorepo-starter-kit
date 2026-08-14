'use client';

import { useTranslation } from '@lib/i18n';
import { CheckIcon, UploadIcon } from '@starterkit/icons';
import {
  type CoverGradientId,
  cn,
  coverGradient,
  DEFAULT_GRADIENT_IDS,
  GRADIENT_PREFIX,
  gradientImageUrl,
  iconSize,
  isGradientImage,
} from '@starterkit/shared';
import Image from 'next/image';
import { useRef, useState } from 'react';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CoverImagePickerProps {
  /** Current value — either `gradient:<id>`, a URL string, or empty/undefined. */
  value: string | undefined;
  /** Called when the user selects a gradient or clears the image. */
  onChange: (value: string | undefined) => void;
  /** Called when a file is selected for upload. Parent handles the upload. */
  onFileSelected: (file: File) => void;
  /** Whether an upload is in progress. */
  isUploading?: boolean;
  /** Preview URL for a custom uploaded image. */
  uploadPreviewUrl?: string | null;
  /** Called when user removes the uploaded image. */
  onRemoveUpload?: () => void;
  /** Test ID prefix. */
  idPrefix?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Full-bleed cover image picker with gradient swatch sidebar.
 * Supports drag-and-drop image upload, gradient selection, and preview.
 * Shared across features (topics, games, etc.).
 */
export function CoverImagePicker({
  value,
  onChange,
  onFileSelected,
  isUploading,
  uploadPreviewUrl,
  onRemoveUpload,
  idPrefix = 'cover',
}: CoverImagePickerProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const isCustomUpload = !!value && !isGradientImage(value);
  const selectedGradientId: CoverGradientId | undefined = isGradientImage(value)
    ? (value.slice(GRADIENT_PREFIX.length) as CoverGradientId)
    : undefined;
  const customPreview = isCustomUpload ? (uploadPreviewUrl ?? value) : undefined;

  function handleGradientSelect(id: CoverGradientId) {
    onChange(gradientImageUrl(id));
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = '';
  }

  function handleRemoveUpload() {
    onChange(undefined);
    onRemoveUpload?.();
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragOver(true);
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
    if (isUploading) return;
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) onFileSelected(file);
  }

  const hasPreview = !!selectedGradientId || !!customPreview;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop container; buttons/labels inside handle keyboard
    <div
      className={cn(
        'group relative -mx-12 -mt-12 h-32 w-[calc(100%+96px)] overflow-hidden',
        !hasPreview && 'border-b border-dashed border-border bg-surface',
        !hasPreview && isDragOver && 'border-primary bg-primary/5',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={`${idPrefix}-cover-picker`}
    >
      {/* Background — gradient or image */}
      {selectedGradientId && (
        <div
          className="absolute inset-0 [background:var(--cover-bg)]"
          style={{ '--cover-bg': coverGradient[selectedGradientId] } as React.CSSProperties}
        />
      )}
      {customPreview && (
        <Image
          src={customPreview}
          alt={t('common:coverBanner.preview')}
          fill
          unoptimized
          className="object-cover"
          data-testid={`${idPrefix}-cover-upload-preview`}
        />
      )}

      {/* Empty state CTA */}
      {!hasPreview && (
        <label
          htmlFor={`${idPrefix}-cover-upload`}
          className={cn(
            'flex h-full w-full cursor-pointer flex-col items-center justify-center gap-sm text-text-muted',
            isUploading && 'pointer-events-none',
          )}
        >
          {isUploading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <>
              <UploadIcon size={32} aria-hidden />
              <span className="text-sm font-medium text-text">{t('common:coverBanner.cta')}</span>
            </>
          )}
        </label>
      )}

      {/* Hover overlay — change / remove (only when has preview) */}
      {hasPreview && (
        <div className="absolute inset-0 flex items-center justify-center gap-sm bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <label
            htmlFor={`${idPrefix}-cover-upload`}
            className={cn(
              'cursor-pointer rounded-lg bg-white/95 px-md py-sm text-sm font-medium text-text transition-colors hover:bg-white',
              isUploading && 'pointer-events-none opacity-60',
            )}
          >
            {t('common:coverBanner.change')}
          </label>
          <button
            type="button"
            onClick={handleRemoveUpload}
            disabled={isUploading}
            className="rounded-lg bg-white/95 px-md py-sm text-sm font-medium text-error transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-60"
          >
            {t('common:coverBanner.remove')}
          </button>
        </div>
      )}

      {/* Upload spinner overlay */}
      {hasPreview && isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}

      {/* ─── Floating sidebar: gradient swatches + upload ─── */}
      <div
        className={cn(
          'absolute top-2 right-2 bottom-2 flex flex-col gap-1.5 rounded-lg bg-black/40 p-1.5 backdrop-blur-sm',
          'transition-opacity',
          hasPreview ? 'opacity-0 group-hover:opacity-100' : 'opacity-100',
        )}
      >
        {DEFAULT_GRADIENT_IDS.map((id) => {
          const isSelected = selectedGradientId === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${t('common:coverBanner.gradientLabel')} ${id}`}
              className={cn(
                'relative h-6 w-10 shrink-0 overflow-hidden rounded border transition-all [background:var(--cover-bg)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                isSelected
                  ? 'border-white ring-1 ring-white/50'
                  : 'border-white/30 hover:border-white/70',
              )}
              style={{ '--cover-bg': coverGradient[id] } as React.CSSProperties}
              onClick={() => handleGradientSelect(id)}
              data-testid={`${idPrefix}-gradient-${id}`}
            >
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <CheckIcon className="text-white" size={iconSize.xs} />
                </div>
              )}
            </button>
          );
        })}

        {/* Upload swatch */}
        <button
          type="button"
          disabled={isUploading}
          aria-label={t('common:coverBanner.uploadLabel')}
          className={cn(
            'flex h-6 w-10 shrink-0 items-center justify-center rounded border border-dashed transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
            isCustomUpload && !selectedGradientId
              ? 'border-white bg-white/20'
              : 'border-white/40 text-white/70 hover:border-white hover:text-white',
          )}
          onClick={handleUploadClick}
          data-testid={`${idPrefix}-cover-upload`}
        >
          <UploadIcon size={iconSize.xs} aria-hidden="true" className="text-white" />
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id={`${idPrefix}-cover-upload`}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        disabled={isUploading}
        onChange={handleFileChange}
        className="sr-only"
        aria-label={t('common:coverBanner.uploadLabel')}
      />
    </div>
  );
}
