// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { MessageReportReason } from './messageReportReason';
import type { MessageReportStatus } from './messageReportStatus';
import type { ReportTargetType } from './reportTargetType';

export interface MessageReportResponse {
  id?: string;
  conversationId?: string;
  messageId?: string;
  reporterId?: string;
  reporterDisplayName?: string;
  reportedUserId?: string;
  reportedUserDisplayName?: string;
  targetType?: ReportTargetType;
  reason?: null | MessageReportReason;
  status?: MessageReportStatus;
  /** @nullable */
  comment?: string | null;
  messageTextSnapshot?: string;
  /** @nullable */
  messageAttachmentUrlSnapshot?: string | null;
  messageSentAtSnapshot?: string;
  /** @nullable */
  reviewReason?: string | null;
  createdAt?: string;
  /** @nullable */
  updatedAt?: string | null;
  /** @nullable */
  updatedBy?: string | null;
}
