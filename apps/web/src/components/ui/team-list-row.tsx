'use client';

import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { Button } from './button';
import { CheckIndicator } from './check-indicator';

// ─── TeamListRow ───────────────────────────────────────────────────────

const deptRowVariants = cva(
  'h-auto w-full justify-start gap-3 rounded-xl border px-4 py-3 text-left',
  {
    variants: {
      selected: {
        true: 'border-success/40 bg-success/5 hover:bg-success/5',
        false: 'border-border hover:border-border-strong hover:bg-transparent',
      },
    },
    defaultVariants: { selected: false },
  },
);

export interface TeamListRowProps {
  isSelected: boolean;
  onClick: () => void;
  /** Optional icon rendered to the left of the content area. */
  icon?: ReactNode;
  children: ReactNode;
}

export function TeamListRow({ isSelected, onClick, icon, children }: TeamListRowProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={deptRowVariants({ selected: isSelected })}
    >
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
      <CheckIndicator checked={isSelected} />
    </Button>
  );
}
