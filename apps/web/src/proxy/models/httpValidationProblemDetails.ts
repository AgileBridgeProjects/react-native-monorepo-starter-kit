// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { HttpValidationProblemDetailsErrors } from './httpValidationProblemDetailsErrors';

export interface HttpValidationProblemDetails {
  /** @nullable */
  type?: string | null;
  /** @nullable */
  title?: string | null;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  status?: number | string | null;
  /** @nullable */
  detail?: string | null;
  /** @nullable */
  instance?: string | null;
  errors?: HttpValidationProblemDetailsErrors;
}
