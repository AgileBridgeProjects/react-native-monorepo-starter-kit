import { cn } from '@starterkit/shared';

// ─── Props ───────────────────────────────────────────────────────────────────

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Controls the dimensions and shape of the skeleton block. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A single shimmering placeholder block.
 *
 * Size and shape are controlled entirely via `className` — pass Tailwind
 * utilities for `h-`, `w-`, and `rounded-` to match whatever you are loading.
 *
 * @example
 * // Heading placeholder
 * <Skeleton className="h-4 w-32 rounded" />
 *
 * // Input placeholder
 * <Skeleton className="h-10 w-full rounded-md" />
 *
 * // Avatar placeholder
 * <Skeleton className="h-10 w-10 rounded-full" />
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('motion-safe:animate-pulse rounded bg-border', className)} {...props} />
  );
}

export type { SkeletonProps };
