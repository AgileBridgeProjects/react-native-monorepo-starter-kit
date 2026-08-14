import { StatusBadge } from '@/components/ui';
import type { StatusBadgeProps } from '@/components/ui/status-badge';
import { AuditAction } from '@/proxy/models';

const variantMap: Record<AuditAction, StatusBadgeProps['variant']> = {
  [AuditAction.Insert]: 'success',
  [AuditAction.Update]: 'info',
  [AuditAction.Delete]: 'error',
};

export function AuditActionBadge({ action }: { action: AuditAction }) {
  return <StatusBadge label={action} variant={variantMap[action]} />;
}
