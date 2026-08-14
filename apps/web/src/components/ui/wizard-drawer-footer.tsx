'use client';

import { cn } from '@starterkit/shared';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

// ─── Variants ─────────────────────────────────────────────────────────────────

const wizardDrawerFooterVariants = cva('flex items-center gap-3', {
  variants: {
    hasLeading: {
      true: 'justify-between',
      false: 'justify-end',
    },
  },
  defaultVariants: {
    hasLeading: false,
  },
});

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WizardDrawerFooterProps extends VariantProps<typeof wizardDrawerFooterVariants> {
  leading?: ReactNode;
  actions: ReactNode;
  className?: string;
  leadingClassName?: string;
  actionsClassName?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WizardDrawerFooter({
  leading,
  actions,
  className,
  leadingClassName,
  actionsClassName,
}: WizardDrawerFooterProps) {
  const hasLeading = leading !== null && leading !== undefined;

  return (
    <div className={cn(wizardDrawerFooterVariants({ hasLeading }), className)}>
      {hasLeading && <div className={cn('min-w-0 flex-1', leadingClassName)}>{leading}</div>}
      <div className={cn('flex shrink-0 items-center justify-end', actionsClassName)}>
        {actions}
      </div>
    </div>
  );
}

export { wizardDrawerFooterVariants };
