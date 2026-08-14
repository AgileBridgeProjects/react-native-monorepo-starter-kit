import { FileIcon, ImageIcon, PdfIcon } from '@starterkit/icons';
import type { ComponentType } from 'react';

/**
 * Returns the appropriate icon component for a given MIME content type.
 */
export function getFileIcon(
  contentType: string,
): ComponentType<{ size?: number; className?: string }> {
  if (contentType === 'application/pdf') return PdfIcon;
  if (contentType.startsWith('image/')) return ImageIcon;
  return FileIcon;
}

/**
 * Estimates the decoded byte size of a base64 string and formats it
 * as a human-readable file size (B / KB / MB).
 */
export function formatFileSize(base64: string): string {
  const bytes = Math.ceil((base64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
