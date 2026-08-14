import { calculateChartLayout } from '@lib/utils/chart-layout';
import { describe, expect, it } from 'vitest';

// spacing.sm === 8 → horizontal padding subtracted is spacing.sm * 2 === 16.
// BAR_SPACING === 8, MIN_BAR_WIDTH === 4.
const PADDING = 16;
const BAR_SPACING = 8;
const MIN_BAR_WIDTH = 4;

describe('calculateChartLayout', () => {
  it('subtracts the container horizontal padding from chartWidth', () => {
    const { chartWidth } = calculateChartLayout(316, 5);
    expect(chartWidth).toBe(316 - PADDING);
  });

  it('always reports the constant bar spacing', () => {
    expect(calculateChartLayout(300, 5).barSpacing).toBe(BAR_SPACING);
    expect(calculateChartLayout(50, 1).barSpacing).toBe(BAR_SPACING);
  });

  it('computes bar width as floor of remaining space divided by data length', () => {
    // chartWidth = 300 - 16 = 284; totalSpacing = 4 * 8 = 32; (284 - 32)/4 = 63
    const { barWidth } = calculateChartLayout(300, 4);
    expect(barWidth).toBe(63);
  });

  it('floors fractional bar widths', () => {
    // chartWidth = 100 - 16 = 84; totalSpacing = 3 * 8 = 24; (84 - 24)/3 = 20
    expect(calculateChartLayout(100, 3).barWidth).toBe(20);
    // chartWidth = 101 - 16 = 85; (85 - 24)/3 = 20.33 → 20
    expect(calculateChartLayout(101, 3).barWidth).toBe(20);
  });

  it('clamps bar width to the minimum when space is too tight', () => {
    // chartWidth = 20 - 16 = 4; totalSpacing = 5 * 8 = 40; (4 - 40)/5 = -7.2 → max(4, ...) = 4
    expect(calculateChartLayout(20, 5).barWidth).toBe(MIN_BAR_WIDTH);
  });

  it('clamps to the minimum at the exact boundary where computed width equals the floor', () => {
    // Find a case where the computed width is just below MIN_BAR_WIDTH.
    // chartWidth = 60 - 16 = 44; totalSpacing = 8 * 8 = 64; (44 - 64)/8 = -2.5 → 4
    expect(calculateChartLayout(60, 8).barWidth).toBe(MIN_BAR_WIDTH);
  });

  it('handles a single data point', () => {
    // chartWidth = 200 - 16 = 184; totalSpacing = 1 * 8 = 8; (184 - 8)/1 = 176
    const layout = calculateChartLayout(200, 1);
    expect(layout.barWidth).toBe(176);
    expect(layout.chartWidth).toBe(184);
  });

  it('produces a deterministic result for identical inputs', () => {
    expect(calculateChartLayout(257, 7)).toEqual(calculateChartLayout(257, 7));
  });
});
