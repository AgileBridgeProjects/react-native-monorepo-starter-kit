// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0

export interface JournalAlertResponse {
  recipientRowId: string;
  severity: string;
  category: string;
  snippet: string;
  entryDateTime: string;
  athleteName: string;
  /** @nullable */
  teamName?: string | null;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  athleteAge?: number | string | null;
  /** @nullable */
  dismissedAt?: string | null;
}
