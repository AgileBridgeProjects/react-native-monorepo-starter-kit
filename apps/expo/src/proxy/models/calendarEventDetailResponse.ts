// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { CalendarEventType } from './calendarEventType';

export interface CalendarEventDetailResponse {
  id: string;
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
  seriesId?: string | null;
  /** @nullable */
  createdByUserId?: string | null;
  isCreatedByCurrentUser?: boolean;
  /** @nullable */
  createdByDisplayName?: string | null;
  teamNames?: string[];
}
