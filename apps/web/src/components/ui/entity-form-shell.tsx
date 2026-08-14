'use client';

import { useTranslation } from '@lib/i18n';
import { useProcessLock } from '@lib/process-lock-context';
import { cn } from '@starterkit/shared';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui';
import { Button } from './button';

// ─── Props ───────────────────────────────────────────────────────────────────

interface EntityFormShellProps {
  /** The form fields to render inside the shell. */
  children: React.ReactNode;
  /** Called when the user clicks Save. Pass react-hook-form's handleSubmit result here. */
  onSubmit: () => void;
  /** Called when the user clicks Cancel. */
  onCancel: () => void;
  /** Shows a spinner and disables buttons while true. */
  isSubmitting?: boolean;
  /** Disables the submit button without showing a spinner (e.g. form is invalid). */
  isSubmitDisabled?: boolean;
  /** Shows a loading skeleton instead of the form while true (e.g. fetching existing data). */
  isLoading?: boolean;
  /** Override the default localised submit button label. */
  submitLabel?: string;
  /** Override the label shown beside the spinner while submitting. */
  submittingLabel?: string;
  /** Override the default localised cancel button label. */
  cancelLabel?: string;
  /** Optional data-testid for the submit button (for E2E targeting). */
  submitButtonTestId?: string;
  /** Optional actions rendered on the left side of the footer row (e.g. a Delete button). */
  extraActions?: React.ReactNode;
  /** Optional button(s) rendered between Cancel and the primary Submit on the right side. */
  secondaryActions?: React.ReactNode;
  /** Remove the divider line above the footer row. */
  hideDivider?: boolean;
  className?: string;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function FormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface-elevated p-lg', className)}>
      <div className="space-y-md">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EntityFormShell({
  children,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isSubmitDisabled = false,
  isLoading = false,
  submitLabel,
  submittingLabel,
  cancelLabel,
  submitButtonTestId,
  extraActions,
  secondaryActions,
  hideDivider = false,
  className,
}: EntityFormShellProps) {
  const { t } = useTranslation();
  const processLock = useProcessLock();

  // Propagate submission state to the enclosing DrawerPanel's process lock so
  // the drawer's close controls are blocked while the mutation is in flight.
  useEffect(() => {
    if (!processLock) return;
    if (isSubmitting) {
      processLock.lock();
    } else {
      processLock.unlock();
    }
    return () => processLock.unlock();
  }, [isSubmitting, processLock]);

  if (isLoading) {
    return <FormSkeleton className={className} />;
  }

  const resolvedSubmitLabel = submitLabel ?? t('common:actions.save');
  const resolvedCancelLabel = cancelLabel ?? t('common:actions.cancel');

  return (
    <div className={cn('flex min-h-full flex-col', className)}>
      {/* Form fields */}
      <div className="flex-1 space-y-md p-lg">{children}</div>

      <div
        data-entity-footer
        className={cn(
          'sticky bottom-0 flex items-center justify-between gap-sm bg-surface-elevated px-lg py-md',
          !hideDivider && 'border-t border-border',
        )}
      >
        <div>{extraActions}</div>
        <div className="flex items-center gap-sm">
          <Button variant="outlined" disabled={isSubmitting} onClick={onCancel}>
            {resolvedCancelLabel}
          </Button>
          {secondaryActions}
          <Button
            disabled={isSubmitting || isSubmitDisabled}
            isLoading={isSubmitting}
            onClick={onSubmit}
            data-testid={submitButtonTestId}
          >
            {isSubmitting ? (submittingLabel ?? t('common:actions.saving')) : resolvedSubmitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { EntityFormShellProps };
