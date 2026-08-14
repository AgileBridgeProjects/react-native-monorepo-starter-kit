// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

export interface SendSmsResponse {
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalRecipients: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  delivered: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  failed: number | string;
}
