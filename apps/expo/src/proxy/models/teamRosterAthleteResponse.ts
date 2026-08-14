// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { PlayingPosition } from './playingPosition';

export interface TeamRosterAthleteResponse {
  id?: string;
  displayName?: string;
  position?: null | PlayingPosition;
  teamId?: string;
  teamName?: string;
  isAssigned?: boolean;
  /** @nullable */
  completedAt?: string | null;
  /** @nullable */
  dueAt?: string | null;
  /** @nullable */
  note?: string | null;
}
