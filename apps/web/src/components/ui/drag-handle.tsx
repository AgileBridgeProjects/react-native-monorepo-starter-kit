import { DragIndicatorIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface DragHandleProps {
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A drag handle indicator for sortable list items.
 * Must be wrapped by a Sortable parent that targets the `.drag-handle` class.
 */
export function DragHandle({ className }: DragHandleProps) {
  return (
    <span
      className={cn('drag-handle cursor-grab text-text-muted active:cursor-grabbing', className)}
    >
      <DragIndicatorIcon size={iconSize.sm} />
    </span>
  );
}
