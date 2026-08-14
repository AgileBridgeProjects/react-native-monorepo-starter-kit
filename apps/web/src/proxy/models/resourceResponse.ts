// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { ResourceSourceType } from './resourceSourceType';

export interface ResourceResponse {
  id?: string;
  title?: string;
  sourceType?: ResourceSourceType;
  storageUrl?: string;
  createdAt?: string;
  /** @nullable */
  createdBy?: string | null;
  /** @nullable */
  updatedAt?: string | null;
  /** @nullable */
  updatedBy?: string | null;
  isDeleted?: boolean;
  /** @nullable */
  deletedAt?: string | null;
}
