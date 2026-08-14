'use client';

import { useLogoUploadConstraints } from '@features/clubs/presentation/hooks/use-logo-upload-constraints';
import { useTranslation } from '@lib/i18n';
import { CloudUploadIcon, DeleteIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import Image from 'next/image';
import { useId, useRef } from 'react';
import { Spinner } from '@/components/ui';

// ─── Props ───────────────────────────────────────────────────────────────────

interface InlineLogoPickerProps {
  /** Committed logo URL to preview (null/undefined = empty). */
  previewUrl?: string | null;
  isUploading?: boolean;
  /** Called with the chosen file — the parent uploads and feeds back the URL. */
  onFile: (file: File) => void;
  /** Called when the user clears the logo. Omit to hide the remove affordance. */
  onRemove?: () => void;
  ariaLabel: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Compact square logo control for dense rows (e.g. inline team creation). Click to pick a file;
 * shows the preview once uploaded, with a hover-reveal remove button. Accepted types come from the
 * shared upload constraints so this never duplicates the backend's allow-list.
 */
export function InlineLogoPicker({
  previewUrl,
  isUploading = false,
  onFile,
  onRemove,
  ariaLabel,
}: InlineLogoPickerProps) {
  const { t } = useTranslation();
  const { data: constraints, isLoading: constraintsLoading } = useLogoUploadConstraints();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const disabled = constraintsLoading || isUploading;
  const hasLogo = Boolean(previewUrl);

  return (
    <div className="group/logo relative h-11 w-11 shrink-0">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={constraints?.acceptedAttribute ?? ''}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          // Reset so re-picking the same file still fires onChange.
          e.target.value = '';
        }}
      />
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border transition-colors',
          hasLogo
            ? 'border-border bg-surface'
            : 'border-dashed border-border bg-surface text-text-muted hover:border-primary hover:text-primary',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        {isUploading ? (
          <Spinner className="h-4 w-4" />
        ) : hasLogo ? (
          <Image
            src={previewUrl as string}
            alt={ariaLabel}
            width={44}
            height={44}
            className="h-full w-full object-contain"
          />
        ) : (
          <CloudUploadIcon size={iconSize.sm} aria-hidden="true" />
        )}
      </button>

      {hasLogo && !isUploading && onRemove && (
        <button
          type="button"
          aria-label={t('clubs:form.teams.removeLogo')}
          onClick={onRemove}
          className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-sm hover:text-error group-hover/logo:flex"
        >
          <DeleteIcon size={iconSize.xs} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
