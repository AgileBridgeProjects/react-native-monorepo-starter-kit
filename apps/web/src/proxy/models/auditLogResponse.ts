// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { AuditAction } from './auditAction';

export interface AuditLogResponse {
  id?: string;
  entityName?: string;
  entityId?: string;
  action?: AuditAction;
  /** @nullable */
  oldValues?: string | null;
  /** @nullable */
  newValues?: string | null;
  /** @nullable */
  userId?: string | null;
  /** @nullable */
  userName?: string | null;
  timestamp?: string;
}
