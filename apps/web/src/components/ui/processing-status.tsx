'use client';

import { cn } from '@starterkit/shared';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ProcessingStatusProps {
  /** Whether the processing affordance is visible. */
  isActive: boolean;
  /** Fallback status label while waiting for the first server progress event. */
  label?: string;
  /** Latest server-authored status message. */
  message?: string;
  /** Render the reusable dark preview shimmer overlay. */
  showOverlay?: boolean;
  /** Render the accessible status row below or beside the processing surface. */
  showStatus?: boolean;
  /** Additional classes for the overlay wrapper. */
  overlayClassName?: string;
  /** Additional classes for the status output row. */
  statusClassName?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProcessingStatus({
  isActive,
  label,
  message,
  showOverlay = false,
  showStatus = true,
  overlayClassName,
  statusClassName,
}: ProcessingStatusProps) {
  const resolvedMessage = message ?? label;

  if (!isActive) return null;

  return (
    <>
      {showOverlay && (
        <div
          className={cn('absolute inset-0 overflow-hidden bg-black/90', overlayClassName)}
          aria-hidden="true"
        >
          <div className="image-processing-shimmer" />
          <div className="absolute inset-x-lg bottom-md h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="image-processing-progress absolute inset-y-0 left-0 rounded-full bg-white/70" />
          </div>
        </div>
      )}
      {showStatus && resolvedMessage && (
        <output
          className={cn('mt-2 flex items-center gap-sm text-text-secondary', statusClassName)}
          aria-live="polite"
          aria-label={resolvedMessage}
        >
          <span
            className="block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden="true"
          />
          <Typography variant="body-sm" className="font-medium text-text-secondary">
            {resolvedMessage}
          </Typography>
        </output>
      )}
    </>
  );
}
