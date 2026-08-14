// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { DiscSessionQuestionOptionResponse } from './discSessionQuestionOptionResponse';

export interface DiscSessionQuestionResponse {
  questionId: string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  orderIndex: number | string;
  content: string;
  options: DiscSessionQuestionOptionResponse[];
  /** @nullable */
  selectedOptionId?: string | null;
}
