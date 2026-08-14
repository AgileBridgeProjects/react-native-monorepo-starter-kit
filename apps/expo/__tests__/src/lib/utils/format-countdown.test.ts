import { formatCountdown } from '@lib/utils/format-countdown';
import { describe, expect, it } from 'vitest';

describe('formatCountdown', () => {
  it('formats whole minutes and zero-padded seconds', () => {
    expect(formatCountdown(90_000)).toBe('1:30');
  });

  it('formats sub-minute durations with a zero minute', () => {
    expect(formatCountdown(5_000)).toBe('0:05');
  });

  it('zero-pads single-digit seconds', () => {
    expect(formatCountdown(9_000)).toBe('0:09');
  });

  it('does not pad the minute component', () => {
    expect(formatCountdown(600_000)).toBe('10:00');
  });

  it('renders 0:00 for exactly zero milliseconds', () => {
    expect(formatCountdown(0)).toBe('0:00');
  });

  it('clamps negative durations to 0:00', () => {
    expect(formatCountdown(-5_000)).toBe('0:00');
    expect(formatCountdown(-1)).toBe('0:00');
  });

  it('rounds up partial seconds (ceil)', () => {
    // 1500ms → ceil to 2 seconds
    expect(formatCountdown(1_500)).toBe('0:02');
    // 1ms → ceil to 1 second
    expect(formatCountdown(1)).toBe('0:01');
    // 999ms → ceil to 1 second
    expect(formatCountdown(999)).toBe('0:01');
  });

  it('handles the exact minute boundary', () => {
    expect(formatCountdown(60_000)).toBe('1:00');
    expect(formatCountdown(59_000)).toBe('0:59');
  });

  it('handles large multi-minute durations', () => {
    // 3661s → 61:01
    expect(formatCountdown(3_661_000)).toBe('61:01');
  });

  it('is deterministic for the same input', () => {
    expect(formatCountdown(123_456)).toBe(formatCountdown(123_456));
  });
});
