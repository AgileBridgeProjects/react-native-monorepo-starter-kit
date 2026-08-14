// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { AttachmentRequest } from './attachmentRequest';
import type { MessageChannel } from './messageChannel';

export interface UpdateNotificationMessageRequest {
  /** @nullable */
  subject: string | null;
  message: string;
  channel: MessageChannel;
  clubId: string;
  /** @nullable */
  teamId: string | null;
  /** @nullable */
  attachments: AttachmentRequest[] | null;
  mediaAttachment?: null | AttachmentRequest;
  clearMedia?: boolean;
}
