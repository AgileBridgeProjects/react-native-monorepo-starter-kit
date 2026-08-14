// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { CalendarEventRepeat } from './calendarEventRepeat';
import type { CalendarEventType } from './calendarEventType';

export interface CreateCalendarEventRequest {
  eventType: CalendarEventType;
  name: string;
  /** @nullable */
  description?: string | null;
  eventStartsAt: string;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  durationMinutes?: number | string | null;
  /** @nullable */
  location?: string | null;
  /** @nullable */
  locationUrl?: string | null;
  /** @nullable */
  directions?: string | null;
  /** @nullable */
  opposingTeam?: string | null;
  isClubWide?: boolean;
  /** @nullable */
  teamId?: string | null;
  repeat?: CalendarEventRepeat;
  /** @nullable */
  repeatUntil?: string | null;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  repeatOccurrences?: number | string | null;
}
