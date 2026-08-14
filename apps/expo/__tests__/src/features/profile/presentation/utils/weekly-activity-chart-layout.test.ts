import { calculateChartLayout } from '@features/profile/presentation/utils/weekly-activity-chart-layout';
import { describe, expect, it } from 'vitest';

// spacing.sm === 8 (from @starterkit/shared), so chartWidth = containerWidth - 16.
// BAR_SPACING === 8, MIN_BAR_WIDTH === 4, barWidth = max(4, floor((chartWidth - 8*n)/n)).

describe('calculateChartLayout', () => {
  it('subtracts the p-sm padding (2 × spacing.sm = 16) from the container width', () => {
    expect(calculateChartLayout(316, 7).chartWidth).toBe(300);
  });

  it('always reports the constant bar spacing of 8', () => {
    expect(calculateChartLayout(300, 7).barSpacing).toBe(8);
    expect(calculateChartLayout(50, 1).barSpacing).toBe(8);
  });

  it('computes bar width filling the chart minus the total inter-bar spacing', () => {
    // chartWidth = 316-16 = 300; totalSpacing = 7*8 = 56; (300-56)/7 = 34.857 → floor 34
    expect(calculateChartLayout(316, 7).barWidth).toBe(34);
  });

  it('floors fractional bar widths (never rounds up)', () => {
    // chartWidth = 116-16 = 100; totalSpacing = 3*8 = 24; (100-24)/3 = 25.33 → 25
    expect(calculateChartLayout(116, 3).barWidth).toBe(25);
  });

  it('clamps the bar width to the MIN_BAR_WIDTH of 4 when space is tight', () => {
    // chartWidth = 36-16 = 20; totalSpacing = 7*8 = 56; (20-56)/7 negative → clamps to 4
    expect(calculateChartLayout(36, 7).barWidth).toBe(4);
  });

  it('clamps to 4 at the exact boundary where computed width drops below 4', () => {
    // pick container so (chartWidth - 8n)/n === 3.x → floor 3 → clamp 4
    // n=1: chartWidth - 8 = 3 → chartWidth=11 → containerWidth=27
    expect(calculateChartLayout(27, 1).barWidth).toBe(4);
  });

  it('does not clamp when the computed width is exactly 4', () => {
    // n=1: chartWidth - 8 = 4 → chartWidth=12 → containerWidth=28
    expect(calculateChartLayout(28, 1).barWidth).toBe(4);
  });

  it('handles a single data point', () => {
    // chartWidth = 116-16 = 100; totalSpacing = 1*8 = 8; (100-8)/1 = 92
    const layout = calculateChartLayout(116, 1);
    expect(layout).toEqual({ barWidth: 92, barSpacing: 8, chartWidth: 100 });
  });

  it('is deterministic for identical inputs', () => {
    expect(calculateChartLayout(280, 7)).toEqual(calculateChartLayout(280, 7));
  });

  it('returns a negative chart width for a container narrower than the padding', () => {
    // edge/invalid: containerWidth 0 → chartWidth = -16, barWidth clamps to 4
    const layout = calculateChartLayout(0, 7);
    expect(layout.chartWidth).toBe(-16);
    expect(layout.barWidth).toBe(4);
  });

  it('yields Infinity-free output and clamps when dataLength interacts with zero width', () => {
    // dataLength 1, container exactly at padding → chartWidth 0, (0-8)/1 = -8 → clamp 4
    expect(calculateChartLayout(16, 1).barWidth).toBe(4);
  });
});
