// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { CheckInEmotion } from './checkInEmotion';

export interface CheckInEmotionSummaryResponse {
  emotion: CheckInEmotion;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  count: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  percentage: number | string;
}
