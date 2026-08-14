// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { AgeGroup } from './ageGroup';

export interface UpdateTeamRequest {
  /** @maxLength 100 */
  name: string;
  /**
   * @maxLength 500
   * @nullable
   */
  description?: string | null;
  ageGroup?: null | AgeGroup;
  /**
   * @maxLength 2048
   * @nullable
   */
  logoUrl?: string | null;
}
