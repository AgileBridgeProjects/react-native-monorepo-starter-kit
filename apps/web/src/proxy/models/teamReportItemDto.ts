// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

export interface TeamReportItemDto {
  teamId?: string;
  teamName?: string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalUsers?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  activeUsers?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  participationRate?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  activityRate?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalSessions?: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  averageAccuracy?: number | string;
  isAnomaly?: boolean;
}
