import { cn } from '@starterkit/shared';
import { Typography } from './typography';

export interface FieldErrorProps {
  /** The error message to display. Renders nothing when falsy. */
  message?: string;
  /** Optional HTML id for `aria-describedby` linkage. */
  id?: string;
  /** Extra Tailwind classes (e.g. alignment or spacing overrides). */
  className?: string;
}

/** Inline validation error message with `role="alert"`. */
export function FieldError({ message, id, className }: FieldErrorProps) {
  if (!message) return null;

  return (
    <Typography
      id={id}
      variant="caption"
      as="p"
      role="alert"
      className={cn('text-error', className)}
    >
      {message}
    </Typography>
  );
}
