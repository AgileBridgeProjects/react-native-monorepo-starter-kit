// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.MobileApi | v1 1.0.0

export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  senderDisplayName: string;
  /** @nullable */
  senderAvatarUrl?: string | null;
  textContent: string;
  sentAt: string;
  /** @nullable */
  attachmentUrl?: string | null;
  /** @nullable */
  attachmentPreviewUrl?: string | null;
  /** @nullable */
  attachmentFileName?: string | null;
  isMine: boolean;
}
