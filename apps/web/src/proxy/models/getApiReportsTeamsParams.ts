// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

export type GetApiReportsTeamsParams = {
  from?: string;
  to?: string;
  /**
   * @minLength 0
   * @maxLength 200
   */
  FilterText?: string;
  SortBy?: string;
  SortDescending?: boolean;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  Page?: number | string;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  PageSize?: number | string;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  ClampedPage?: number | string;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  ClampedPageSize?: number | string;
};
