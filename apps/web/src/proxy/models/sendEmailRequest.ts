// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { AttachmentRequest } from './attachmentRequest';

export interface SendEmailRequest {
  /** @nullable */
  clubIds: string[] | null;
  /** @nullable */
  teamIds: string[] | null;
  subject: string;
  message: string;
  /** @nullable */
  attachments: AttachmentRequest[] | null;
}
