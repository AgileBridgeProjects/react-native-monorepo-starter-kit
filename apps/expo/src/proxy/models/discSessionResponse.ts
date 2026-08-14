// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { DiscSessionQuestionResponse } from './discSessionQuestionResponse';

export interface DiscSessionResponse {
  questions: DiscSessionQuestionResponse[];
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  answeredCount: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalCount: number | string;
}
