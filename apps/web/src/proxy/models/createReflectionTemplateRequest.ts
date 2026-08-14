// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { ReflectionQuestionRequest } from './reflectionQuestionRequest';
import type { ReflectionType } from './reflectionType';

export interface CreateReflectionTemplateRequest {
  /** @maxLength 200 */
  name: string;
  reflectionType: ReflectionType;
  /**
   * @minimum 0
   * @maximum 2147483647
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  xpValue?: number | string | null;
  questions?: ReflectionQuestionRequest[];
}
