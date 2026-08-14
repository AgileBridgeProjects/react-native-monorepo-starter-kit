'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Typography } from './typography';

export const emptyStateVariants = cva('flex flex-col items-center gap-3 text-center', {
  variants: {
    surface: {
      card: 'rounded-lg border border-dashed border-border p-12',
      bare: 'px-12 py-6',
    },
  },
  defaultVariants: {
    surface: 'card',
  },
});

export interface EmptyStateProps extends VariantProps<typeof emptyStateVariants> {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  surface,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(emptyStateVariants({ surface }), className)}>
      {icon}
      {title && <Typography variant="h3">{title}</Typography>}
      {description && (
        <Typography variant="body" className="text-text-secondary">
          {description}
        </Typography>
      )}
      {action}
    </div>
  );
}
