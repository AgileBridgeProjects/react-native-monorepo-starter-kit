// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { ConversationType } from './conversationType';

export interface ConversationResponse {
  id: string;
  conversationType: ConversationType;
  displayName: string;
  /** @nullable */
  teamId?: string | null;
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  unreadCount: number | string;
  /** @nullable */
  lastMessageText?: string | null;
  /** @nullable */
  lastMessageSentAt?: string | null;
  canSend: boolean;
  /** @nullable */
  otherUserId?: string | null;
  /** @nullable */
  otherUserAvatarUrl?: string | null;
  isBlockedByCurrentUser: boolean;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  memberCount?: number | string | null;
}
