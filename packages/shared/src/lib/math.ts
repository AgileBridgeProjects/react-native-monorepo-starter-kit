/**
 * Shared math utilities used across mobile and web.
 */
export const MathUtil = {
  /**
   * Returns the percentage of `value` out of `total`, clamped to [0, 100].
   * Returns 0 for any non-positive total or negative value.
   *
   * @example
   * MathUtil.percentage(4, 8)  // 50
   * MathUtil.percentage(0, 8)  // 0
   * MathUtil.percentage(8, 0)  // 0
   * MathUtil.percentage(-1, 8) // 0
   * MathUtil.percentage(10, 8) // 100
   */
  percentage(value: number, total: number): number {
    if (total <= 0 || value < 0) return 0;
    return Math.min((value / total) * 100, 100);
  },
} as const;
