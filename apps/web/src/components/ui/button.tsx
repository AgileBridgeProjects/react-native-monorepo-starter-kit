'use client';

import { cn } from '@starterkit/shared';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Spinner } from './spinner';

// ─── Variants ─────────────────────────────────────────────────────────────────

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        /* text-primary-foreground, not text-white: primary is volt, and white
           on volt is ~1.2:1. The token always carries the correct pairing. */
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        danger: 'bg-error text-white hover:bg-error/90',
        outlined: 'border border-border bg-transparent text-text hover:bg-surface',
        ghost: 'bg-transparent text-text hover:bg-surface',
        /* Foreground comes from .btn-gradient-cta — its volt gradient needs an
           onyx label, so the colour lives with the gradient, not here. */
        generate: 'btn-gradient-cta',
      },
      size: {
        /** Square padding for icon-only buttons — no excess horizontal space. */
        icon: 'p-xs',
        sm: 'px-sm py-xs',
        md: 'px-md py-sm',
        lg: 'px-lg py-md text-base',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Shows a loading state and disables the button. */
  isLoading?: boolean;
  /** Icon rendered before children. Swapped for a spinner when isLoading is true. */
  icon?: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, isLoading, disabled, icon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        aria-busy={isLoading || undefined}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        {...props}
      >
        {isLoading ? (
          <Spinner
            className={cn(
              'h-3 w-3',
              variant !== 'outlined' && variant !== 'ghost' && 'border-white',
            )}
          />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { buttonVariants };
