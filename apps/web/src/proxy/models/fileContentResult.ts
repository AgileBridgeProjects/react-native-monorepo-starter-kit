// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { EntityTagHeaderValue } from './entityTagHeaderValue';

export interface FileContentResult {
  fileContents?: string;
  /** @nullable */
  contentType?: string | null;
  /** @nullable */
  fileDownloadName?: string | null;
  /** @nullable */
  lastModified?: string | null;
  entityTag?: null | EntityTagHeaderValue;
  enableRangeProcessing?: boolean;
}
