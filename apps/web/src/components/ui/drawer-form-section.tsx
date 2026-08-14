import type { ReactNode } from 'react';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface DrawerFormSectionProps {
  /** Small icon rendered to the left of the title (e.g. <PuzzleIcon />). */
  icon: ReactNode;
  /** Section heading — displayed uppercase in the primary colour. */
  title: string;
  children: ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Tinted form section used inside drawers where an inline form sits below
 * a reorderable list. Provides the light-primary background, icon header, and
 * consistent padding that matches the sub-topics and game-category patterns.
 */
export function DrawerFormSection({ icon, title, children }: DrawerFormSectionProps) {
  return (
    <div className="space-y-md rounded-lg bg-primary/5 p-md">
      <div className="flex items-center gap-2">
        <span className="text-primary" aria-hidden="true">
          {icon}
        </span>
        <Typography
          variant="caption"
          className="font-semibold uppercase tracking-wider text-primary"
        >
          {title}
        </Typography>
      </div>
      {children}
    </div>
  );
}
