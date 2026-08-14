// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { ReflectionAssignmentQuestionResponse } from './reflectionAssignmentQuestionResponse';
import type { ReflectionType } from './reflectionType';

export interface ReflectionAssignmentResponse {
  id: string;
  name: string;
  reflectionType: ReflectionType;
  /** @nullable */
  dueAt?: string | null;
  /** @nullable */
  completedAt?: string | null;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  firstUnansweredIndex: number | string;
  questions: ReflectionAssignmentQuestionResponse[];
}
