// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

export interface ClubResponse {
  id: string;
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  /** @nullable */
  zipCode?: string | null;
  /** @nullable */
  timezone?: string | null;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  maxAthletes?: number | string | null;
  /** @nullable */
  logoUrl?: string | null;
  createdAt: string;
  /** @nullable */
  createdBy?: string | null;
  /** @nullable */
  updatedAt?: string | null;
  /** @nullable */
  updatedBy?: string | null;
  isDeleted: boolean;
  /** @nullable */
  deletedAt?: string | null;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  activeUserCount?: number | string | null;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  teamCount?: number | string | null;
}
