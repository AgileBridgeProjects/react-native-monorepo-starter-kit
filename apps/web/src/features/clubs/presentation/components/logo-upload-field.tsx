'use client';

import { useLogoUploadConstraints } from '@features/clubs/presentation/hooks/use-logo-upload-constraints';
import { useTranslation } from '@lib/i18n';
import { ImageUploadField } from '@/components/ui';

// ─── Props ───────────────────────────────────────────────────────────────────

interface LogoUploadFieldProps {
  isUploading: boolean;
  previewUrl?: string;
  /** Latest server-authored status message while logo processing runs. */
  processingMessage?: string;
  onChange: (file: File) => void;
  /** Called when the user clicks "Remove" — parent should clear logoUrl from the form. */
  onRemove?: () => void;
  /** Field label. Defaults to the club-logo label. */
  label?: string;
  /** Unique id for the hidden file input. Defaults to "club-logo-upload". */
  id?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Club-logo upload field — delegates to the shared ImageUploadField.
 *
 * Accepted MIME types and max file size are fetched from
 * `/api/clubs/upload-constraints` so the frontend never duplicates these
 * values from the backend's `LogoUploadOptions`. The field is disabled while
 * constraints are loading so a user can't open a file picker that would let
 * them pick a file the server will reject.
 */
export function LogoUploadField({
  isUploading,
  previewUrl,
  processingMessage,
  onChange,
  onRemove,
  label,
  id = 'club-logo-upload',
}: LogoUploadFieldProps) {
  const { t } = useTranslation();
  const { data: constraints, isLoading: constraintsLoading } = useLogoUploadConstraints();

  return (
    <ImageUploadField
      label={label ?? t('clubs:form.logo.label')}
      id={id}
      isUploading={isUploading}
      disabled={constraintsLoading}
      previewUrl={previewUrl}
      onChange={onChange}
      onRemove={onRemove}
      accept={constraints?.acceptedAttribute ?? ''}
      processingLabel={t('clubs:form.logo.processing')}
      processingMessage={processingMessage}
      checkeredPreview
      hint={
        // While constraints load the field is disabled (see `isUploading` above),
        // so the empty hint is never the only thing the user sees.
        constraints ? t('clubs:form.logo.hint', { maxSizeMb: constraints.maxFileSizeMb }) : ''
      }
      previewAlt={t('clubs:form.logo.previewAlt')}
    />
  );
}
