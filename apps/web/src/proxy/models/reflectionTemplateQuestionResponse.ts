// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { JsonElement } from './jsonElement';
import type { ReflectionQuestionType } from './reflectionQuestionType';

export interface ReflectionTemplateQuestionResponse {
  id?: string;
  questionType?: ReflectionQuestionType;
  questionContent?: JsonElement;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  sortOrder?: number | string;
}
