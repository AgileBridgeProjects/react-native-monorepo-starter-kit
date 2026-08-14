// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { RsvpResponseType } from './rsvpResponseType';

export interface CalendarEventRsvpResponse {
  id: string;
  calendarEventId: string;
  userId: string;
  responseType: RsvpResponseType;
  respondedAt: string;
}
