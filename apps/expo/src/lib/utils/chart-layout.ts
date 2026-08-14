import { spacing } from '@starterkit/shared';

const BAR_SPACING = 8;
const MIN_BAR_WIDTH = 4;

export interface ChartLayout {
  barWidth: number;
  barSpacing: number;
  chartWidth: number;
}

/**
 * Calculates bar width and chart width so bars fill the measured container.
 * Accounts for padding applied to the chart container view.
 */
export function calculateChartLayout(containerWidth: number, dataLength: number): ChartLayout {
  const chartWidth = containerWidth - spacing.sm * 2;
  // GiftedBarChart adds a trailing gap after the last bar, so account for dataLength gaps total
  const totalSpacing = dataLength * BAR_SPACING;
  const barWidth = Math.max(MIN_BAR_WIDTH, Math.floor((chartWidth - totalSpacing) / dataLength));
  return { barWidth, barSpacing: BAR_SPACING, chartWidth };
}
