import { cn } from '@starterkit/shared';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

// ─── Variants ────────────────────────────────────────────────────────────────

const bannerVariants = cva('rounded-md border px-md py-sm text-sm', {
  variants: {
    variant: {
      success: 'border-success/30 bg-success/10 text-success',
      warning: 'border-warning/30 bg-warning/10 text-warning-foreground',
      error: 'border-error/30 bg-error/10 text-error',
      info: 'border-info/30 bg-info/10 text-info',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

// ─── Props ───────────────────────────────────────────────────────────────────

export interface BannerProps extends VariantProps<typeof bannerVariants> {
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Banner({ variant, children, className, 'data-testid': testId }: BannerProps) {
  return (
    <div role="alert" data-testid={testId} className={cn(bannerVariants({ variant }), className)}>
      {children}
    </div>
  );
}

export { bannerVariants };
