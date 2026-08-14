'use client';

import { cn } from '@lib/cn';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { EmailIcon } from '@starterkit/icons';
import { iconSize, SETUP_TOKEN_EXPIRY_HOURS } from '@starterkit/shared';
import { Button, ModalShell, SegmentedButton, Typography } from '@/components/ui';

export type BulkResendFilter = 'both' | 'pending' | 'expired';

interface BulkResendSetupModalProps {
  visible: boolean;
  isPending: boolean;
  filter: BulkResendFilter;
  pendingCount: number;
  expiredCount: number;
  totalCount: number;
  onHide: () => void;
  onFilterChange: (filter: BulkResendFilter) => void;
  onConfirm: () => void;
}

export function BulkResendSetupModal({
  visible,
  isPending,
  filter,
  pendingCount,
  expiredCount,
  totalCount,
  onHide,
  onFilterChange,
  onConfirm,
}: BulkResendSetupModalProps) {
  const { t } = useTranslation();

  return (
    <ModalShell
      visible={visible}
      onHide={onHide}
      width={uiConfig.popup.defaultWidth}
      testId="users-bulk-resend-setup-modal"
      icon={<EmailIcon size={iconSize.sm} className="text-primary" />}
      title={t('users:bulkResend.modal.title')}
      description={t('users:bulkResend.modal.description')}
    >
      <div className="flex flex-col gap-md">
        <SegmentedButton
          legend={t('users:bulkResend.modal.filterLegend')}
          options={[
            { value: 'both', label: t('users:bulkResend.modal.filterPendingAndExpired') },
            { value: 'pending', label: t('users:bulkResend.modal.filterPending') },
            { value: 'expired', label: t('users:bulkResend.modal.filterExpired') },
          ]}
          value={filter}
          onValueChanged={onFilterChange}
        />

        <div className="rounded-md border border-border bg-surface p-sm">
          {(filter === 'both' || filter === 'expired') && (
            <Typography variant="body-sm" className="text-text leading-relaxed">
              {t('users:bulkResend.modal.explainerExpired', { hours: SETUP_TOKEN_EXPIRY_HOURS })}
            </Typography>
          )}

          {(filter === 'both' || filter === 'pending') && (
            <Typography
              variant="body-sm"
              className={cn('text-text leading-relaxed', filter === 'both' && 'mt-sm')}
            >
              {t('users:bulkResend.modal.explainerPending', { hours: SETUP_TOKEN_EXPIRY_HOURS })}
            </Typography>
          )}
        </div>

        <Typography variant="body-sm" className="text-text-secondary font-medium">
          {t('users:bulkResend.modal.counts', {
            pending: pendingCount,
            expired: expiredCount,
            total: totalCount,
          })}
        </Typography>

        <div className="flex justify-end gap-sm border-t border-border pt-md">
          <Button type="button" variant="outlined" onClick={onHide} disabled={isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            isLoading={isPending}
            onClick={onConfirm}
            disabled={
              (filter === 'pending' && pendingCount === 0) ||
              (filter === 'expired' && expiredCount === 0) ||
              totalCount === 0
            }
          >
            {t('users:bulkResend.modal.confirm')}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export type { BulkResendSetupModalProps };
