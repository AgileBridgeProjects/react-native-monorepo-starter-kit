'use client';

import { cn } from '@/lib/cn';

export interface SwitchProps {
  checked: boolean;
  className?: string;
}

export function Switch({ checked, className }: SwitchProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
        checked ? 'bg-primary' : 'bg-border',
        className,
      )}
    >
      <div
        className={cn(
          'h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </div>
  );
}
