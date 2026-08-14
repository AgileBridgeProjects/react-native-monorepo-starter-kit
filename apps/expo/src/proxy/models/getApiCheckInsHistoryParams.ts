// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { CheckInEmotion } from './checkInEmotion';

export type GetApiCheckInsHistoryParams = {
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  page?: number | string;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  pageSize?: number | string;
  /**
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  days?: number | string;
  emotion?: CheckInEmotion;
};
