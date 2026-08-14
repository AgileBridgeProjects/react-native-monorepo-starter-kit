// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { CheckInEmotionSummaryResponse } from './checkInEmotionSummaryResponse';

export interface CheckInSummaryResponse {
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  days: number | string;
  /** @nullable */
  timezone?: string | null;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalCount: number | string;
  emotions?: CheckInEmotionSummaryResponse[];
}
