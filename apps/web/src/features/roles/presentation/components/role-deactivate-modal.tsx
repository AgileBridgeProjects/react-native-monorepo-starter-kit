'use client';

import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { WarningIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { Button, ModalShell, Skeleton, Typography } from '@/components/ui';
import type { RoleUserAssignmentResponse } from '@/proxy/models';

// ─── Props ───────────────────────────────────────────────────────────────────

interface RoleDeactivateModalProps {
  visible: boolean;
  roleName: string;
  assignments: RoleUserAssignmentResponse[];
  isLoading: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RoleDeactivateModal({
  visible,
  roleName,
  assignments,
  isLoading,
  isPending,
  onConfirm,
  onCancel,
}: RoleDeactivateModalProps) {
  const { t } = useTranslation();
  const hasAssignments = assignments.length > 0;

  return (
    <ModalShell
      visible={visible}
      onHide={onCancel}
      width={uiConfig.popup.defaultWidth}
      testId="role-deactivate-modal"
      icon={<WarningIcon size={iconSize.sm} className="text-warning" />}
      iconClassName="bg-warning/10"
      title={t('roles:deactivate.modal.title', { name: roleName })}
      description={
        hasAssignments
          ? t('roles:deactivate.modal.blockedDescription', { count: assignments.length })
          : t('roles:deactivate.modal.description', { name: roleName })
      }
    >
      <div className="flex flex-col gap-lg">
        {isLoading && (
          <div className="flex flex-col gap-xs">
            <Skeleton className="h-4 w-28" />
            <div className="rounded-md border border-border">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-md border-b border-border px-md py-sm last:border-b-0"
                >
                  <div className="flex flex-col gap-xs">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && hasAssignments && (
          <div className="flex flex-col gap-xs">
            <Typography variant="body-sm" className="font-medium">
              {t('roles:deactivate.modal.affectedUsers')}
            </Typography>

            <ul
              className="max-h-64 overflow-y-auto rounded-md border border-border"
              aria-label={t('roles:deactivate.modal.affectedUsers')}
            >
              {assignments.map((user) => (
                <li
                  key={user.userId}
                  className="flex items-center justify-between gap-md border-b border-border px-md py-sm last:border-b-0"
                >
                  <div className="flex flex-col gap-xs">
                    <Typography variant="body-sm" className="font-medium">
                      {user.displayName}
                    </Typography>
                    <Typography variant="body-sm" className="text-text-muted">
                      {user.email}
                    </Typography>
                  </div>
                  <Typography variant="body-sm" className="shrink-0 text-text-muted">
                    {user.clubName}
                  </Typography>
                </li>
              ))}
            </ul>

            <Typography variant="body-sm" className="text-text-muted">
              {t('roles:deactivate.modal.reassignHint')}
            </Typography>
          </div>
        )}

        <div className="flex justify-end gap-sm border-t border-border pt-lg">
          <Button variant="outlined" type="button" onClick={onCancel}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            disabled={hasAssignments || isLoading}
            isLoading={isPending}
            onClick={onConfirm}
          >
            {t('roles:deactivate.modal.confirm')}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
