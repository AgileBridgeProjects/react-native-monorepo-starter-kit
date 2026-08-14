// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { ReflectionTemplateQuestionResponse } from './reflectionTemplateQuestionResponse';
import type { ReflectionType } from './reflectionType';

export interface ReflectionTemplateResponse {
  id?: string;
  name?: string;
  reflectionType?: ReflectionType;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  xpValue?: number | string | null;
  isActive?: boolean;
  questions?: ReflectionTemplateQuestionResponse[];
  sharedClubIds?: string[];
  createdAt?: string;
  /** @nullable */
  createdBy?: string | null;
  /** @nullable */
  updatedAt?: string | null;
  /** @nullable */
  updatedBy?: string | null;
}
