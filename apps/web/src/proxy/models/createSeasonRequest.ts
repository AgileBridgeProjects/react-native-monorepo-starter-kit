// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

export interface CreateSeasonRequest {
  /**
   * @maxLength 100
   * @nullable
   */
  name?: string | null;
  startDate: string;
  endDate: string;
  /** @nullable */
  cloneTeamsFromSeasonId?: string | null;
}
