// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { PlayingPosition } from './playingPosition';

export interface UpdateProfileRequest {
  /**
   * @maxLength 100
   * @nullable
   */
  displayName?: string | null;
  /** @nullable */
  avatarBlobPath?: string | null;
  removeAvatar?: boolean;
  position?: null | PlayingPosition;
  /**
   * @minimum 0
   * @maximum 99
   * @nullable
   */
  jerseyNumber?: number | null;
  /** @nullable */
  fullBodyPhotoBlobPath?: string | null;
  removeFullBodyPhoto?: boolean;
  /** @nullable */
  facePhotoBlobPath?: string | null;
  removeFacePhoto?: boolean;
  completeOnboarding?: boolean;
}
