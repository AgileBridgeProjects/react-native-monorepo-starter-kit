'use client';

import { COVER_PATTERN_STYLES } from '@lib/cover-patterns';
import { useTranslation } from '@lib/i18n';
import { isBrowserRenderableUrl } from '@lib/url-utils';
import { CloudUploadIcon } from '@starterkit/icons';
import type { CoverPatternId } from '@starterkit/shared';
import { cn, iconSize } from '@starterkit/shared';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { Spinner } from './spinner';
import { Typography } from './typography';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CoverImageBannerProps {
  /** Unique id for the hidden file input. */
  id: string;
  /** Current image URL (server URL). When set the image is shown; otherwise the upload CTA. */
  imageUrl?: string | null;
  /** Optional CSS gradient string. Shown as background when no imageUrl is set. */
  gradient?: string | null;
  /** Optional SVG pattern overlay rendered on top of the gradient or image. */
  pattern?: CoverPatternId | null;
  /** Alt text for the displayed image. */
  alt: string;
  /** Whether an upload is currently in progress. */
  isUploading?: boolean;
  /** Called with the chosen file (from click or drag-and-drop). */
  onChange: (file: File) => void;
  /** Called when the user clicks Remove. Parent should clear the URL from form state. */
  onRemove?: () => void;
  /** Accepted MIME types for the file input. Defaults to `"image/*"`. */
  accept?: string;
  /** When true, shows a required-field asterisk on the empty-state prompt. */
  required?: boolean;
  /** When true, disables negative-margin bleed so the banner fits inside a flex container. */
  contained?: boolean;
  /** Maximum allowed file size in bytes. When set, files exceeding this limit are rejected before any preview is created. */
  maxSizeBytes?: number;
  /** Called with an error message when the file is rejected, or null when a valid file is accepted. */
  onError?: (message: string | null) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A full-width 16:9 banner that lets the user set a cover image.
 *
 * Empty state  — drag-and-drop / click-to-upload CTA.
 * Filled state — image preview with "Change" and "Remove" hover overlay.
 *
 * Place this as the **first child** inside EntityFormShell so the banner
 * bleeds to the EntityFormShell content-area edge via negative margins.
 */
export function CoverImageBanner({
  id,
  imageUrl,
  gradient,
  pattern,
  alt,
  isUploading = false,
  onChange,
  onRemove,
  accept = 'image/*',
  required = false,
  contained = false,
  maxSizeBytes,
  onError,
}: CoverImageBannerProps) {
  const { t } = useTranslation();
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const localPreviewRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke object URL on unmount to prevent memory leaks.
  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    };
  }, []);

  // When the parent clears imageUrl (e.g. form reset), also clear the local preview.
  useEffect(() => {
    if (!imageUrl) {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
      setLocalPreview(null);
    }
  }, [imageUrl]);

  const processFile = useCallback(
    (file: File) => {
      if (maxSizeBytes !== undefined && file.size > maxSizeBytes) {
        const maxMb = Math.round(maxSizeBytes / 1024 / 1024);
        onError?.(t('common:coverBanner.fileTooLarge', { maxMb }));
        return;
      }
      onError?.(null);
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
      const objectUrl = URL.createObjectURL(file);
      localPreviewRef.current = objectUrl;
      setLocalPreview(objectUrl);
      onChange(file);
    },
    [onChange, maxSizeBytes, onError, t],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear when leaving the banner itself, not a child element.
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = null;
    setLocalPreview(null);
    onRemove?.();
  }

  function handleBrowseClick() {
    inputRef.current?.click();
  }

  const displayUrl = isBrowserRenderableUrl(imageUrl) ? imageUrl : localPreview;
  const hasImage = !!displayUrl;
  const hasContent = hasImage || !!gradient;
  const activePatternStyle = pattern && pattern !== 'none' ? COVER_PATTERN_STYLES[pattern] : null;

  return (
    // Two layers of p-lg surround this banner:
    //   1. DrawerPanel's scroll content wrapper: p-lg (24px)
    //   2. EntityFormShell's inner content div: p-lg (24px)
    // -mx-[48px] / -mt-[48px] cancel both → true edge-to-edge.
    // w-[calc(100%+96px)] compensates for the horizontal bleed (2 × 48px).
    // h-32 matches the exact banner height used on topic/game cards in Expo.
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop container; the <label> inside handles keyboard/click access
    <div
      className={cn(
        'group relative h-32 overflow-hidden',
        contained ? 'w-full' : 'full-bleed-banner',
        !hasContent && 'border border-dashed border-border bg-surface',
        !hasContent && isDragging && 'bg-primary/5 border-primary',
      )}
      style={gradient && !hasImage ? { background: gradient } : undefined}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {hasContent ? (
        <>
          {/* Image (takes priority over gradient) */}
          {hasImage && (
            <Image
              src={displayUrl}
              alt={alt}
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
            />
          )}

          {/* Pattern overlay — sits above gradient/image, below interactive controls */}
          {activePatternStyle && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: activePatternStyle.backgroundImage,
                backgroundSize: activePatternStyle.backgroundSize,
                backgroundRepeat: activePatternStyle.backgroundRepeat,
                backgroundPosition: activePatternStyle.backgroundPosition,
              }}
            />
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-sm bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <Button
              type="button"
              variant="outlined"
              onClick={handleBrowseClick}
              disabled={isUploading}
              className="border-transparent bg-surface-elevated/95 hover:bg-surface-elevated"
            >
              {t('common:coverBanner.change')}
            </Button>
            {onRemove && (
              <Button
                type="button"
                variant="outlined"
                onClick={handleRemove}
                disabled={isUploading}
                className="border-transparent bg-surface-elevated/95 text-error hover:bg-surface-elevated hover:text-error"
              >
                {t('common:coverBanner.remove')}
              </Button>
            )}
          </div>

          {/* Upload spinner */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Spinner className="border-on-primary" />
            </div>
          )}
        </>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            'flex h-full w-full cursor-pointer flex-col items-center justify-center gap-sm text-text-muted',
            isUploading && 'pointer-events-none',
          )}
        >
          {isUploading ? (
            <Spinner />
          ) : (
            <>
              <CloudUploadIcon size={iconSize.lg} aria-hidden className="text-text-muted" />
              <div className="space-y-xs text-center">
                <Typography variant="body-sm" className="font-semibold text-text">
                  {t('common:coverBanner.cta')}
                  {required && (
                    <Typography as="span" variant="label" className="ml-xs text-error">
                      *
                    </Typography>
                  )}
                </Typography>
                <Typography as="p" variant="caption" className="text-text-muted">
                  {t('common:coverBanner.browsePrefix')}{' '}
                  <span className="font-medium text-text-muted underline underline-offset-2">
                    {t('common:coverBanner.browse')}
                  </span>{' '}
                  {t('common:coverBanner.browseSuffix')}
                </Typography>
                {maxSizeBytes !== undefined && (
                  <Typography as="p" variant="caption" className="text-text-muted">
                    {t('common:coverBanner.maxSizeHint', {
                      maxMb: Math.round(maxSizeBytes / 1024 / 1024),
                    })}
                  </Typography>
                )}
              </div>
            </>
          )}
        </label>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={isUploading}
        onChange={handleInputChange}
        className="sr-only"
      />
    </div>
  );
}
