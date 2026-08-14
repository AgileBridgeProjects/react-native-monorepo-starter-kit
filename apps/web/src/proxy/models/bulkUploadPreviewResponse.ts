// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { BulkUploadInvalidRowResponse } from './bulkUploadInvalidRowResponse';
import type { BulkUploadValidRowRequest } from './bulkUploadValidRowRequest';

export interface BulkUploadPreviewResponse {
  readyToAdd?: BulkUploadValidRowRequest[];
  validationErrors?: BulkUploadInvalidRowResponse[];
  duplicates?: BulkUploadInvalidRowResponse[];
  unprocessable?: BulkUploadInvalidRowResponse[];
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalRows?: number | string;
}
