// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { AttachmentResponse } from './attachmentResponse';
import type { MessageChannel } from './messageChannel';
import type { NotificationStatus } from './notificationStatus';

export interface NotificationMessageResponse {
  id: string;
  subject: string;
  message: string;
  status: NotificationStatus;
  channel: MessageChannel;
  clubId: string;
  /** @nullable */
  teamId: string | null;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalRecipients: number | string | null;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  delivered: number | string | null;
  /**
   * @nullable
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  failed: number | string | null;
  /** @nullable */
  sentAt: string | null;
  /** @nullable */
  sentBy: string | null;
  createdAt: string;
  /** @nullable */
  createdBy: string | null;
  attachments: AttachmentResponse[];
  /** @nullable */
  mediaUrl?: string | null;
}
