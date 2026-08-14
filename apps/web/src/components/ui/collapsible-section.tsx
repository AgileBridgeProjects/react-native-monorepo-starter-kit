'use client';

import { ExpandLessIcon, ExpandMoreIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import { useState } from 'react';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CollapsibleSectionProps {
  /** Section heading shown in the toggle row. */
  title: string;
  /** Content revealed when expanded. */
  children: React.ReactNode;
  /** Whether the section starts open. Defaults to false (collapsed). */
  defaultOpen?: boolean;
  /**
   * When true, forces the section open regardless of internal toggle state.
   * Use this to reveal hidden validation errors inside the section.
   */
  forceOpen?: boolean;
  /** Additional class names applied to the outer wrapper. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A simple accessible disclosure / accordion section.
 * Renders a clickable header row that toggles the visibility of its children.
 * Defaults to collapsed — pass `defaultOpen` to start expanded.
 */
export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  forceOpen = false,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const effectiveOpen = forceOpen || isOpen;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Toggle row */}
      <button
        type="button"
        aria-expanded={effectiveOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="group inline-flex w-fit items-center gap-xs text-left text-text-muted transition-colors hover:text-text"
      >
        <Typography variant="label" className="font-medium">
          {title}
        </Typography>
        {effectiveOpen ? (
          <ExpandLessIcon size={iconSize.xs} aria-hidden="true" />
        ) : (
          <ExpandMoreIcon size={iconSize.xs} aria-hidden="true" />
        )}
      </button>

      {/* Collapsible body */}
      {effectiveOpen && <div className="mt-md flex flex-col gap-md">{children}</div>}
    </div>
  );
}
