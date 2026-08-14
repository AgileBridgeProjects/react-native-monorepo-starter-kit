'use client';

import { CheckmarkIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { cva } from 'class-variance-authority';

const checkIndicatorVariants = cva(
  'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
  {
    variants: {
      checked: {
        true: 'border-success bg-success',
        false: 'border-border',
      },
    },
    defaultVariants: { checked: false },
  },
);

export interface CheckIndicatorProps {
  checked: boolean;
}

export function CheckIndicator({ checked }: CheckIndicatorProps) {
  return (
    <div className={checkIndicatorVariants({ checked })} aria-hidden>
      {/* Onyx, not white — the fill is the bright on-dark success green. */}
      {checked && (
        <CheckmarkIcon className="text-primary-foreground" size={iconSize.xs} aria-hidden="true" />
      )}
    </div>
  );
}
