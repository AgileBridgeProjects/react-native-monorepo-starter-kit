import { cn } from '@starterkit/shared';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ProgressBarProps {
  /** Percentage value (0–100). Clamped to 100 for rendering. */
  percent: number;
  /** Tailwind color class applied to the filled portion (e.g. `bg-green-500`). Ignored when `gradient` is true. */
  barColorClass?: string;
  /** Height class for the track. @default `'h-1.5'` */
  heightClass?: string;
  /** Background class for the track. @default `'bg-white/10'` */
  trackClass?: string;
  /** Applies the StarterKit brand gradient to the filled portion. */
  gradient?: boolean;
  /** Accessible label for the progressbar role. */
  ariaLabel?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProgressBar({
  percent,
  barColorClass = 'bg-primary',
  heightClass = 'h-1.5',
  trackClass = 'bg-white/10',
  gradient = false,
  ariaLabel,
}: ProgressBarProps) {
  const clampedPercent = Math.min(100, percent);

  let barClass = cn('h-full rounded-full transition-all', barColorClass);
  if (gradient) {
    barClass = 'gradient-progress-fill h-full rounded-full transition-[width] duration-500';
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn('w-full overflow-hidden rounded-full', heightClass, trackClass)}
    >
      <div className={barClass} style={{ width: `${clampedPercent}%` }} />
    </div>
  );
}
