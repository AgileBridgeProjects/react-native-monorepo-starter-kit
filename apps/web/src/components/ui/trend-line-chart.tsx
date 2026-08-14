'use client';

import { ArgumentAxis, Chart, Legend, Series, Tooltip, ValueAxis } from 'devextreme-react/chart';
import { useMemo } from 'react';

export interface TrendLineSeriesDef {
  /** Field on each data point holding this series' value. */
  valueField: string;
  name: string;
  color: string;
}

/** A point on the time axis; extra numeric fields are referenced by series valueField. */
export type TrendLinePoint = { date: Date } & Record<string, Date | number>;

export interface TrendLineChartProps {
  data: TrendLinePoint[];
  series: TrendLineSeriesDef[];
  height?: number;
  /** Hides axes and legend for a compact sparkline rendering. */
  sparkline?: boolean;
  /** Hides the legend while keeping axes visible (useful when the card title already names the metric). */
  hideLegend?: boolean;
  /** Appended to tooltip values (e.g. "%"). Only applied in sparkline mode. */
  tooltipSuffix?: string;
}

/**
 * Shared spline trend chart over a continuous datetime axis.
 *
 * The datetime axis (rather than categorical date strings) keeps the time domain
 * stable across granularity changes, so DevExtreme can morph the lines into their
 * new shape instead of redrawing unrelated categories.
 */
export function TrendLineChart({
  data,
  series,
  height = 320,
  sparkline = false,
  hideLegend = false,
  tooltipSuffix,
}: TrendLineChartProps) {
  // Stable identities so axis options never churn between renders — this keeps the
  // axes on DevExtreme's in-place update path, which smoothly animates value-range
  // changes when the data updates.
  const axisVisibility = useMemo(() => ({ visible: !sparkline }), [sparkline]);
  const gridVisibility = useMemo(() => ({ visible: !sparkline }), [sparkline]);

  return (
    <Chart
      dataSource={data}
      className="w-full bg-transparent"
      height={height}
      animation={{ enabled: true, duration: 800, easing: 'easeOutCubic' }}
    >
      {series.map((s) => (
        <Series
          key={s.valueField}
          valueField={s.valueField}
          argumentField="date"
          type="spline"
          name={s.name}
          color={s.color}
          showInLegend={!sparkline && !hideLegend}
          // Fresh object literal on purpose: the changed option identity forces the
          // series to re-render with its draw animation on every data update (a bare
          // dataSource swap would snap the lines into place without animating).
          point={{ visible: true, size: 5 }}
        />
      ))}
      <ArgumentAxis
        argumentType="datetime"
        visible={!sparkline}
        label={axisVisibility}
        tick={axisVisibility}
      />
      <ValueAxis
        visible={!sparkline}
        label={axisVisibility}
        tick={axisVisibility}
        grid={gridVisibility}
      />
      <Legend
        visible={!sparkline && !hideLegend}
        verticalAlignment="bottom"
        horizontalAlignment="center"
      />
      <Tooltip
        enabled
        shared={!sparkline}
        customizeTooltip={
          sparkline
            ? (e: { argumentText?: string; valueText?: string }) => ({
                text: `${e.argumentText ?? ''}: ${e.valueText ?? ''}${tooltipSuffix ?? ''}`,
              })
            : undefined
        }
      />
    </Chart>
  );
}
