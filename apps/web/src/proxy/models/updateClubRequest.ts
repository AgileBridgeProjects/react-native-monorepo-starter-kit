// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

export interface UpdateClubRequest {
  /** @maxLength 100 */
  name: string;
  /** @maxLength 200 */
  streetAddress: string;
  /** @maxLength 100 */
  city: string;
  /** @pattern ^[A-Z]{2}$ */
  state: string;
  /**
   * @nullable
   * @pattern ^\d{5}(-\d{4})?$
   */
  zipCode?: string | null;
  /**
   * @maxLength 100
   * @nullable
   */
  timezone?: string | null;
  /**
   * @minimum 1
   * @maximum 2147483647
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  maxAthletes?: number | string | null;
  /**
   * @maxLength 2048
   * @nullable
   */
  logoUrl?: string | null;
}
