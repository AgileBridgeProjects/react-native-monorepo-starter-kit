// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { AuthenticationMethod } from './authenticationMethod';
import type { PlayingPosition } from './playingPosition';

export interface AdminCreateUserRequest {
  clubId?: string;
  roleName?: string;
  firstName?: string;
  lastName?: string;
  authMethod?: AuthenticationMethod;
  /** @nullable */
  email?: string | null;
  /** @nullable */
  phoneNumber?: string | null;
  /** @nullable */
  username?: string | null;
  /** @nullable */
  password?: string | null;
  /** @nullable */
  dateOfBirth?: string | null;
  position?: null | PlayingPosition;
  /**
   * @minimum 0
   * @maximum 99
   * @nullable
   */
  jerseyNumber?: number | null;
  /** @nullable */
  teamIds?: string[] | null;
  /** @nullable */
  dependentUserIds?: string[] | null;
  /**
   * @maxLength 254
   * @nullable
   */
  parentGuardianEmail?: string | null;
}
