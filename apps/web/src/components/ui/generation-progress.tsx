import { SparkleIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import type { ReactNode } from 'react';
import { ProgressBar } from './progress-bar';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface GenerationProgressProps {
  /** The current status message to display beneath the placeholder. */
  statusMessage: string;
  /** Percentage value (0–100) for the progress bar. */
  progressPercent: number;
  /** When true, renders the gradient progress bar. */
  showProgress: boolean;
  /** Accessible label for the progress bar. */
  progressLabel: string;
  /** Placeholder content rendered above the status row (e.g. a skeleton). */
  children?: ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GenerationProgress({
  statusMessage,
  progressPercent,
  showProgress,
  progressLabel,
  children,
}: GenerationProgressProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="generate-progress">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <SparkleIcon size={iconSize.sm} className="gradient-wave-icon" aria-hidden="true" />
          <Typography variant="body-sm" className="gradient-wave-text text-center font-medium">
            {statusMessage}
          </Typography>
        </div>
        {showProgress && (
          <ProgressBar
            percent={progressPercent}
            gradient
            ariaLabel={progressLabel}
            trackClass="bg-border"
          />
        )}
      </div>
      {children}
    </div>
  );
}
