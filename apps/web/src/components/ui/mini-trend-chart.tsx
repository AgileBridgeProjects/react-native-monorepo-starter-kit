'use client';

import { Skeleton } from './skeleton';
import { TrendLineChart } from './trend-line-chart';
import { Typography } from './typography';

// Type alias (not interface) so it satisfies TrendLinePoint's index signature.
export type MiniTrendPoint = {
  date: Date;
  value: number;
};

export interface MiniTrendChartProps {
  title: string;
  points: MiniTrendPoint[];
  isLoading: boolean;
  /** Appended to tooltip values (e.g. "%"). */
  suffix?: string;
}

/** Compact card with a sparkline trend — skeleton while loading, em dash when empty. */
export function MiniTrendChart({ title, points, isLoading, suffix }: MiniTrendChartProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-elevated p-4">
      <Typography variant="body-sm" className="font-medium text-text-secondary">
        {title}
      </Typography>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : points.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <Typography variant="body-sm" className="text-text-secondary">
            —
          </Typography>
        </div>
      ) : (
        <TrendLineChart
          data={points}
          series={[{ valueField: 'value', name: title, color: 'var(--color-primary)' }]}
          height={160}
          hideLegend
          tooltipSuffix={suffix}
        />
      )}
    </div>
  );
}
