// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { AuthenticationMethod } from './authenticationMethod';
import type { PlayingPosition } from './playingPosition';
import type { SetupStatus } from './setupStatus';

export interface UserResponse {
  id?: string;
  clubId?: string;
  email?: string;
  /** @nullable */
  phoneNumber?: string | null;
  /** @nullable */
  username?: string | null;
  authMethod?: AuthenticationMethod;
  displayName?: string;
  /** @nullable */
  avatarUrl?: string | null;
  isActive?: boolean;
  createdAt?: string;
  /** @nullable */
  lastLoginAt?: string | null;
  /** @nullable */
  dateOfBirth?: string | null;
  position?: null | PlayingPosition;
  /** @nullable */
  jerseyNumber?: number | null;
  teamIds?: string[];
  dependentUserIds?: string[];
  roles?: string[];
  isSharedAcrossClubs?: boolean;
  setupStatus?: SetupStatus;
  /** @nullable */
  setupLink?: string | null;
}
