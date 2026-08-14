// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { BulkUploadInvalidRowResponse } from './bulkUploadInvalidRowResponse';

export interface BulkUploadConfirmResponse {
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  createdCount?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  failedCount?: number | string;
  failures?: BulkUploadInvalidRowResponse[];
}
