'use client';

import { useTranslation } from '@lib/i18n';
import { AddIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { Button } from './button';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NewButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Optional override for the button label. Defaults to translated "New". */
  label?: string;
  /** Optional leading icon override. Defaults to the "+" add icon. */
  icon?: ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Consistent primary action button. Defaults to the "+ New" add affordance, but the leading
 * icon can be overridden (e.g. a download icon for an Export action) so the same shared button
 * is reused across the portal.
 */
export const NewButton = forwardRef<HTMLButtonElement, NewButtonProps>(
  ({ label, icon, className, children, ...props }, ref) => {
    const { t } = useTranslation();
    return (
      <Button ref={ref} variant="primary" className={className} {...props}>
        <span className="mr-1 inline-flex items-center" aria-hidden="true">
          {icon ?? <AddIcon size={iconSize.xs} />}
        </span>
        {label ?? t('buttons:new')}
        {children}
      </Button>
    );
  },
);

NewButton.displayName = 'NewButton';
