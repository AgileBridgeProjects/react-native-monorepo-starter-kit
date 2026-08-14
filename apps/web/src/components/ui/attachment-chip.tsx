import { formatFileSize, getFileIcon } from '@lib/file-utils';
import { CloseIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { Button } from './button';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttachmentChipProps {
  fileName: string;
  contentType: string;
  contentBase64: string;
  onRemove?: () => void;
  disabled?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttachmentChip({
  fileName,
  contentType,
  contentBase64,
  onRemove,
  disabled,
}: AttachmentChipProps) {
  const Icon = getFileIcon(contentType);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-2 py-1.5">
      <Icon size={iconSize.xs} className="shrink-0 text-primary" />
      <div className="flex flex-col leading-tight">
        <span className="max-w-24 truncate text-xs font-medium text-text">{fileName}</span>
        <span className="text-xs text-text-muted">{formatFileSize(contentBase64)}</span>
      </div>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${fileName}`}
          className="ml-0.5 size-6 shrink-0 p-0"
        >
          <CloseIcon size={iconSize.xs} />
        </Button>
      )}
    </div>
  );
}
