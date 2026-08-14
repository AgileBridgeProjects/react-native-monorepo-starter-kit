'use client';

import { cn } from '@starterkit/shared';
import { Typography } from './typography';

export interface SelectOptionContentProps {
  label: string;
  supportingText?: string | null;
  className?: string;
}

export function SelectOptionContent({
  label,
  supportingText,
  className,
}: SelectOptionContentProps) {
  return (
    <div className={cn('flex min-w-0 items-center justify-between gap-sm', className)}>
      <Typography variant="body-sm" className="min-w-0 truncate text-text">
        {label}
      </Typography>
      {supportingText && (
        <Typography variant="caption" className="shrink-0 text-right text-text-muted">
          {supportingText}
        </Typography>
      )}
    </div>
  );
}
