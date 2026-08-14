// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { AuthenticationMethod } from './authenticationMethod';
import type { PlayingPosition } from './playingPosition';

export interface BulkUploadValidRowRequest {
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  rowNumber?: number | string;
  firstName?: string;
  lastName?: string;
  /** @nullable */
  email?: string | null;
  /** @nullable */
  phoneNumber?: string | null;
  /** @nullable */
  countryCode?: string | null;
  authMethod?: AuthenticationMethod;
  roleName?: string;
  /** @nullable */
  teamName?: string | null;
  /** @nullable */
  teamId?: string | null;
  /** @nullable */
  username?: string | null;
  /** @nullable */
  dateOfBirth?: string | null;
  position?: null | PlayingPosition;
  /**
   * @minimum 0
   * @maximum 99
   * @nullable
   */
  jerseyNumber?: number | null;
  /**
   * @maxLength 254
   * @nullable
   */
  parentGuardianEmail?: string | null;
}
