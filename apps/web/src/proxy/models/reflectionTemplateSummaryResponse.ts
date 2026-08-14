// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { ReflectionType } from './reflectionType';

export interface ReflectionTemplateSummaryResponse {
  id?: string;
  name?: string;
  reflectionType?: ReflectionType;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  xpValue?: number | string | null;
  isActive?: boolean;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  questionCount?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  sharedClubCount?: number | string;
  createdAt?: string;
  /** @nullable */
  updatedAt?: string | null;
}
