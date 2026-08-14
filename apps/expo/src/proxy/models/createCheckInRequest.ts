// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { CheckInEmotion } from './checkInEmotion';

export interface CreateCheckInRequest {
  emotion: CheckInEmotion;
  /** @nullable */
  reasonLookupId?: string | null;
}
