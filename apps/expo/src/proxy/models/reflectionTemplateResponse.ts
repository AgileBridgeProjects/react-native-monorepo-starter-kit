// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
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
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  questionCount?: number | string;
}
