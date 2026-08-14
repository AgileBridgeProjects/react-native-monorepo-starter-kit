// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { AgeGroup } from './ageGroup';

export interface TeamResponse {
  id?: string;
  seasonId?: string;
  name?: string;
  /** @nullable */
  description?: string | null;
  ageGroup?: null | AgeGroup;
  /** @nullable */
  logoUrl?: string | null;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  userCount?: number | string;
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
