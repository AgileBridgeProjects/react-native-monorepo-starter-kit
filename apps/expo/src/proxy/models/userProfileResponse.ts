// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { AuthenticationMethod } from './authenticationMethod';
import type { PlayingPosition } from './playingPosition';

export interface UserProfileResponse {
  id: string;
  displayName: string;
  email: string;
  /** @nullable */
  avatarUrl: string | null;
  /** @nullable */
  clubName: string | null;
  teamIds: string[];
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  gamesPlayed: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  gamesPassed: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalSessions: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalAssignedGames: number | string;
  joinedAt: string;
  authMethod: AuthenticationMethod;
  isCoach: boolean;
  position: null | PlayingPosition;
  /** @nullable */
  jerseyNumber: number | null;
  /** @nullable */
  fullBodyPhotoUrl: string | null;
  /** @nullable */
  facePhotoUrl: string | null;
  /** @nullable */
  onboardingCompletedAt: string | null;
  roles: string[];
  /** @nullable */
  onboardingRole: string | null;
  /** @nullable */
  teamId?: string | null;
}
