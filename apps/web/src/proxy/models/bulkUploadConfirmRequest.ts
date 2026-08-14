// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { BulkUploadValidRowRequest } from './bulkUploadValidRowRequest';

export interface BulkUploadConfirmRequest {
  clubId?: string;
  /** @nullable */
  teamId?: string | null;
  validRows?: BulkUploadValidRowRequest[];
}
