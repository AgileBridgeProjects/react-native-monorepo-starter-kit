// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

export interface UpdateReflectionTemplateRequest {
  /** @maxLength 200 */
  name: string;
  /**
   * @minimum 0
   * @maximum 2147483647
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  xpValue?: number | string | null;
}
