'use client';

import { ArgumentAxis, Chart, Series, Tooltip, ValueAxis } from 'devextreme-react/chart';
import { useMemo } from 'react';
import { Typography } from './typography';

export interface ForecastPoint {
  date: Date;
  value: number;
  lower: number;
  upper: number;
  isLowConfidence: boolean;
}

export interface ForecastTrendChartProps {
  /** Historical trend points ordered oldest → newest. */
  history: Array<{ date: Date; value: number }>;
  /** Forecast points with growing confidence cone, one per future step. */
  forecast: ForecastPoint[];
  /** Appended to tooltip values, e.g. '%'. */
  valueSuffix?: string;
  /** Chart height in px. Defaults to 160. */
  height?: number;
  /** Shown below the chart when isLowConfidence is true. */
  lowConfidenceLabel?: string;
}

type ChartPoint = {
  date: Date;
  histValue?: number;
  connValue?: number;
  bandLow?: number;
  bandHigh?: number;
};

/**
 * Spline trend chart with a dashed forecast extension and a confidence cone (rangeArea).
 * The cone fans from zero-width at the last historical date to the full CI at the forecast date.
 * Low-confidence projections (< 4 data points) use a wider band; an optional warning label
 * can be shown beneath the chart.
 */
export function ForecastTrendChart({
  history,
  forecast,
  valueSuffix = '',
  height = 160,
  lowConfidenceLabel,
}: ForecastTrendChartProps) {
  const bandOpacity = forecast[0]?.isLowConfidence ? 0.25 : 0.12;

  const chartData = useMemo<ChartPoint[]>(() => {
    if (history.length === 0 || forecast.length === 0) return [];
    const points: ChartPoint[] = history.map((p, i) => ({
      date: p.date,
      histValue: p.value,
      // Connector and band both start at the last historical point (zero-width cone base).
      connValue: i === history.length - 1 ? p.value : undefined,
      bandLow: i === history.length - 1 ? p.value : undefined,
      bandHigh: i === history.length - 1 ? p.value : undefined,
    }));
    for (const fp of forecast) {
      points.push({
        date: fp.date,
        connValue: fp.value,
        bandLow: fp.lower,
        bandHigh: fp.upper,
      });
    }
    return points;
  }, [history, forecast]);

  return (
    <div className="flex flex-col gap-1">
      <Chart
        dataSource={chartData}
        className="w-full bg-transparent"
        height={height}
        animation={{ enabled: true, duration: 600, easing: 'easeOutCubic' }}
      >
        {/* Solid historical spline */}
        <Series
          type="spline"
          valueField="histValue"
          argumentField="date"
          color="var(--color-primary)"
          point={{ visible: false }}
          showInLegend={false}
        />
        {/* Dashed connector from last historical point to forecast value */}
        <Series
          type="spline"
          valueField="connValue"
          argumentField="date"
          color="var(--color-primary)"
          dashStyle="dash"
          point={{ visible: true, size: 6, color: 'var(--color-primary)' }}
          showInLegend={false}
        />
        {/* Confidence cone: zero-width at last historical date, full CI at forecast date */}
        <Series
          type="rangearea"
          rangeValue1Field="bandLow"
          rangeValue2Field="bandHigh"
          argumentField="date"
          color="var(--color-primary)"
          opacity={bandOpacity}
          showInLegend={false}
        />
        <ArgumentAxis
          argumentType="datetime"
          visible={false}
          label={{ visible: false }}
          tick={{ visible: false }}
        />
        <ValueAxis
          visible={false}
          label={{ visible: false }}
          tick={{ visible: false }}
          grid={{ visible: false }}
        />
        <Tooltip
          enabled
          shared={false}
          customizeTooltip={(e: { argumentText?: string; valueText?: string }) => ({
            text: `${e.argumentText ?? ''}: ${e.valueText ?? ''}${valueSuffix}`,
          })}
        />
      </Chart>
      {(forecast[0]?.isLowConfidence ?? false) && lowConfidenceLabel && (
        <Typography variant="body-sm" className="text-center italic text-text-secondary">
          {lowConfidenceLabel}
        </Typography>
      )}
    </div>
  );
}
