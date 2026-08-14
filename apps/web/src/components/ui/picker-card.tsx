'use client';

import { cn } from '@starterkit/shared';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PickerCardProps {
  /** Icon element rendered inside the circular background. */
  icon: React.ReactNode;
  /** Card title. */
  title: string;
  /** Optional description text shown below the title. */
  description?: string;
  /** Called when the card is clicked (no-op when disabled). */
  onClick: () => void;
  /** Disables interaction and dims the card. */
  disabled?: boolean;
  /** Highlights the card as the currently selected option. */
  isSelected?: boolean;
  /**
   * Optional badge rendered below the description — used e.g. for a
   * "Coming soon" label on not-yet-available options.
   */
  badge?: React.ReactNode;
  /** Additional class names applied to the outer button. */
  className?: string;
  'data-testid'?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Shared picker card used throughout the system wherever the user must choose
 * one option from a set before proceeding (content mode, question type, etc.).
 *
 * Renders a bordered, centred button with a circular icon, title, and
 * optional description / badge. Supports selected and disabled states.
 */
export function PickerCard({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  isSelected = false,
  badge,
  className,
  'data-testid': testId,
}: PickerCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={isSelected}
      data-testid={testId}
      className={cn(
        'group h-auto w-full flex-col items-center gap-sm rounded-lg border-2 px-md py-lg text-center transition-all',
        'flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isSelected
          ? 'border-primary bg-primary/5'
          : disabled
            ? 'cursor-not-allowed border-border bg-surface-elevated opacity-60'
            : 'border-border bg-surface hover:border-primary hover:bg-primary/5 hover:shadow-sm',
        className,
      )}
    >
      {/* Circular icon container */}
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-full transition-colors',
          isSelected
            ? 'bg-primary/20 text-primary'
            : 'bg-primary/10 text-primary group-hover:bg-primary/20',
        )}
      >
        {icon}
      </span>

      {/* Title */}
      <Typography variant="body-sm" className="font-semibold">
        {title}
      </Typography>

      {/* Description */}
      {description && (
        <Typography variant="caption" className="text-text-muted">
          {description}
        </Typography>
      )}

      {/* Optional badge (e.g. "Coming soon") */}
      {badge}
    </button>
  );
}
