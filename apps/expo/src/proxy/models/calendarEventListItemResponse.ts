// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { CalendarEventType } from './calendarEventType';
import type { RsvpResponseType } from './rsvpResponseType';

export interface CalendarEventListItemResponse {
  id: string;
  eventType: CalendarEventType;
  name: string;
  eventStartsAt: string;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  durationMinutes?: number | string | null;
  /** @nullable */
  location?: string | null;
  /** @nullable */
  opposingTeam?: string | null;
  isClubWide?: boolean;
  /** @nullable */
  seriesId?: string | null;
  myRsvpStatus?: null | RsvpResponseType;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  goingCount?: number | string;
  isCreatedByCurrentUser?: boolean;
}
