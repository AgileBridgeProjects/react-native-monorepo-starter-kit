'use client';

import type { ReactNode } from 'react';
import { WizardDrawerFooter } from './wizard-drawer-footer';
import { type WizardFooterAction, WizardFooterActions } from './wizard-footer-actions';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DrawerFooterProps {
  /** Primary submit button label. */
  submitLabel?: string;
  onSubmit?: () => void;
  submitVariant?: WizardFooterAction['variant'];
  submitIcon?: WizardFooterAction['icon'];
  submitTooltip?: string;
  submitClassName?: string;
  isLoading?: boolean;
  disabled?: boolean;
  submitTestId?: string;
  /** When provided, renders a cancel button before the submit button. */
  onCancel?: () => void;
  cancelLabel?: string;
  cancelDisabled?: boolean;
  cancelTestId?: string;
  /** Extra action buttons inserted between cancel and submit (e.g. "Create & Game"). */
  extraActions?: WizardFooterAction[];
  /** Leading slot — rendered left-aligned (e.g. Delete, End Now). */
  leading?: ReactNode;
  /** Allow actions to wrap for dense multi-action footers. */
  wrap?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DrawerFooter({
  submitLabel,
  onSubmit,
  submitVariant,
  submitIcon,
  submitTooltip,
  submitClassName,
  isLoading,
  disabled,
  submitTestId,
  onCancel,
  cancelLabel = 'Cancel',
  cancelDisabled,
  cancelTestId,
  extraActions = [],
  leading,
  wrap,
}: DrawerFooterProps) {
  const actions: WizardFooterAction[] = [
    ...(onCancel
      ? [
          {
            label: cancelLabel,
            variant: 'outlined' as const,
            onClick: onCancel,
            disabled: cancelDisabled,
            testId: cancelTestId,
          },
        ]
      : []),
    ...extraActions,
    ...(submitLabel && onSubmit
      ? [
          {
            label: submitLabel,
            onClick: onSubmit,
            variant: submitVariant,
            icon: submitIcon,
            tooltip: submitTooltip,
            className: submitClassName,
            isLoading,
            disabled,
            testId: submitTestId,
          },
        ]
      : []),
  ];

  return (
    <WizardDrawerFooter
      leading={leading}
      actions={<WizardFooterActions actions={actions} wrap={wrap} />}
    />
  );
}
