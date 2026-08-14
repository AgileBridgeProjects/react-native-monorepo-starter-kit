import { cn } from '@starterkit/shared';
import type { ReactNode } from 'react';
import './animated-gradient-border.css';

interface AnimatedGradientBorderProps {
  children: ReactNode;
  className?: string;
  /** Background Tailwind class for the inner content area. Default: 'bg-surface-elevated' */
  innerBg?: string;
}

/**
 * Wraps content in a uniform animated gradient border that signals
 * "generation in progress".
 *
 * The ring is two masked layers painted from this single element's own
 * padding geometry (see `.gradient-border-outer` in globals.css):
 *
 * 1. A static, full-strength brand-gradient ring — every side is always
 *    fully saturated, so the border reads as the same thickness everywhere.
 * 2. A luminous "comet" that orbits the ring to make the in-progress state
 *    unmistakable, without ever thinning or darkening the base ring.
 *
 * Radius (12 px), thickness (2 px), and inner radius (10 px) are fixed in
 * `.gradient-border-outer` in `animated-gradient-border.css` so no inline styles are needed.
 */
export function AnimatedGradientBorder({
  children,
  className,
  innerBg = 'bg-surface-elevated',
}: AnimatedGradientBorderProps) {
  return (
    <div className={cn('gradient-border-outer', className)}>
      <div className={cn('gradient-border-content', innerBg)}>{children}</div>
    </div>
  );
}
