// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { GuardianRelationship } from './guardianRelationship';
import type { PlayingPosition } from './playingPosition';

export interface LinkedAthleteResponse {
  athleteUserId: string;
  displayName: string;
  /** @nullable */
  teamName: string | null;
  position: null | PlayingPosition;
  /** @nullable */
  jerseyNumber: number | null;
  /** @nullable */
  photoUrl: string | null;
  relationship: null | GuardianRelationship;
}
