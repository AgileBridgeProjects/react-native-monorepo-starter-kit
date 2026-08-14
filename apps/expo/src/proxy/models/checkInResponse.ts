// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { CheckInEmotion } from './checkInEmotion';
import type { CheckInReminderSlot } from './checkInReminderSlot';

export interface CheckInResponse {
  id: string;
  emotion: CheckInEmotion;
  /** @nullable */
  reasonLookupId?: string | null;
  /** @nullable */
  reasonDescription?: string | null;
  checkedInAt: string;
  reminderSlot?: null | CheckInReminderSlot;
}
