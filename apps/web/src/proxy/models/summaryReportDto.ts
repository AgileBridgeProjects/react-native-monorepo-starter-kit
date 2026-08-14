// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

export interface SummaryReportDto {
  dateFrom?: string;
  dateTo?: string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  participationRate?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  participationRateDelta?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalActivePlayers?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalActivePlayersDelta?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalSessions?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalSessionsDelta?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  averageAccuracy?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  averageAccuracyDelta?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalCompletions?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  totalCompletionsDelta?: number | string;
}
