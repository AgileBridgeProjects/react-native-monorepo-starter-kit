// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0

export interface AssignSurveyRequest {
  templateId: string;
  /** @minItems 1 */
  athleteUserIds: string[];
  /** @nullable */
  dueAt?: string | null;
  /**
   * @maxLength 500
   * @nullable
   */
  note?: string | null;
}
