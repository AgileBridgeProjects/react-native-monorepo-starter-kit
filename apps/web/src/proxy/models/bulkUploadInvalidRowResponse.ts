// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

export interface BulkUploadInvalidRowResponse {
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  rowNumber?: number | string;
  /** @nullable */
  firstName?: string | null;
  /** @nullable */
  lastName?: string | null;
  /** @nullable */
  email?: string | null;
  /** @nullable */
  phoneNumber?: string | null;
  errors?: string[];
}
