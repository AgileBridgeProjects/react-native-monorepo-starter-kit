// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { ReflectionType } from './reflectionType';

export interface ReflectionAssignmentListItemResponse {
  id: string;
  name: string;
  reflectionType: ReflectionType;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  questionCount: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  answeredCount: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  estimatedMinutes: number | string;
  /** @nullable */
  dueAt?: string | null;
  /** @nullable */
  completedAt?: string | null;
}
