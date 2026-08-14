import { cn } from '@starterkit/shared';

export interface TooltipProps {
  children: React.ReactNode;
  /** Tailwind group name used for hover/focus visibility (e.g. `"badge"` → `group/badge`). */
  groupName?: string;
  /** HTML id for `aria-describedby` linkage. */
  id?: string;
}

/**
 * Positioned CSS tooltip that appears below the trigger on hover / focus-visible.
 * The parent element must have `group/<groupName>` and `relative` classes.
 */
export function Tooltip({ children, groupName = 'tooltip', id }: TooltipProps) {
  // Tailwind can't generate arbitrary group names dynamically, so we map to static classes.
  const visibilityClass = {
    tooltip: 'group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100',
    donut: 'group-hover/donut:opacity-100 group-focus-visible/donut:opacity-100',
    badge: 'group-hover/badge:opacity-100 group-focus-visible/badge:opacity-100',
  }[groupName];

  return (
    <div
      id={id}
      role="tooltip"
      className={cn(
        'pointer-events-none absolute top-full left-1/2 z-50 mt-1.5 -translate-x-1/2 rounded-md bg-surface-elevated px-2.5 py-1.5 text-xs shadow-lg ring-1 ring-border opacity-0 transition-opacity',
        visibilityClass,
      )}
    >
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-surface-elevated" />
      <div className="flex flex-col gap-0.5 whitespace-nowrap">{children}</div>
    </div>
  );
}
