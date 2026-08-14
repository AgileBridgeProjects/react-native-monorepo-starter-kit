// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0
import type { ConversationResponse } from './conversationResponse';

export interface ConversationListResponse {
  items: ConversationResponse[];
  /** @pattern ^-?(?:0|[1-9]\d*)$ */
  totalUnreadCount: number | string;
}
