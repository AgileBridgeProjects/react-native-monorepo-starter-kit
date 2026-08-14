// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { JsonElement } from './jsonElement';
import type { ReflectionAnswerResponse } from './reflectionAnswerResponse';
import type { ReflectionQuestionType } from './reflectionQuestionType';

export interface ReflectionAssignmentQuestionResponse {
  id: string;
  questionType: ReflectionQuestionType;
  questionContent: JsonElement;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  sortOrder: number | string;
  answer?: null | ReflectionAnswerResponse;
}
