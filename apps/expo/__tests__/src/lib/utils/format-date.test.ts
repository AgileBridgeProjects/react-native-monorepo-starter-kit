import { formatLongDate, formatMobileDate } from '@lib/utils/format-date';
import { describe, expect, it } from 'vitest';

// Asserted structurally rather than against an exact month abbreviation, because the
// short-month string ("Sep" vs "Sept") is ICU-version dependent. The load-bearing
// behaviour is: "<day> <month> '<2-digit-year>" with the apostrophe before the year.
const MOBILE_DATE_PATTERN = /^\d{1,2}\s+[A-Za-z.]+\s+'\d{2}$/;

describe('formatMobileDate', () => {
  it('formats a Date into "d Mon \'yy" shape with the apostrophe before the year', () => {
    const result = formatMobileDate(new Date('2026-09-12T12:00:00'));
    expect(result).toMatch(MOBILE_DATE_PATTERN);
    expect(result.startsWith('12 ')).toBeTruthy();
    expect(result.endsWith("'26")).toBeTruthy();
  });

  it('accepts an ISO string input', () => {
    const result = formatMobileDate('2026-09-12T12:00:00');
    expect(result).toMatch(MOBILE_DATE_PATTERN);
    expect(result.endsWith("'26")).toBeTruthy();
  });

  it('accepts a numeric epoch-millis input', () => {
    const millis = new Date('2026-09-12T12:00:00').getTime();
    const result = formatMobileDate(millis);
    expect(result).toMatch(MOBILE_DATE_PATTERN);
  });

  it('produces the same output for equivalent Date / string / number inputs', () => {
    const date = new Date('2026-09-12T12:00:00');
    const fromDate = formatMobileDate(date);
    const fromString = formatMobileDate('2026-09-12T12:00:00');
    const fromNumber = formatMobileDate(date.getTime());
    expect(fromString).toBe(fromDate);
    expect(fromNumber).toBe(fromDate);
  });

  it('renders the day-of-month at the start of the string', () => {
    // The en-ZA "numeric" day style pads to two digits (e.g. "05").
    const result = formatMobileDate(new Date('2026-01-05T12:00:00'));
    expect(/^0?5\s/.test(result)).toBeTruthy();
    expect(result).toMatch(MOBILE_DATE_PATTERN);
  });

  it('returns an empty string for an invalid date string', () => {
    expect(formatMobileDate('not-a-date')).toBe('');
  });

  it('returns an empty string for NaN epoch input', () => {
    expect(formatMobileDate(Number.NaN)).toBe('');
  });

  it('returns an empty string for an invalid Date object', () => {
    expect(formatMobileDate(new Date('invalid'))).toBe('');
  });

  it('is deterministic for the same input', () => {
    const date = new Date('2026-09-12T12:00:00');
    expect(formatMobileDate(date)).toBe(formatMobileDate(date));
  });
});

describe('formatLongDate', () => {
  it('spells out the month', () => {
    const result = formatLongDate(new Date('2026-09-12T12:00:00'));
    expect(result).toContain('12');
    expect(result).toContain('2026');
    expect(result.length).toBeGreaterThan('12/09/2026'.length);
  });

  it('is deterministic for the same input', () => {
    const date = new Date('2026-09-12T12:00:00');
    expect(formatLongDate(date)).toBe(formatLongDate(date));
  });
});
