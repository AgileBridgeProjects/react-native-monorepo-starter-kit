import { describe, expect, it } from 'vitest';
import { toIsoDateString } from '../dx-date-box-value';

describe('toIsoDateString', () => {
  it('returns an empty string for null', () => {
    expect(toIsoDateString(null)).toBe('');
  });

  it('returns an empty string for an empty string', () => {
    expect(toIsoDateString('')).toBe('');
  });

  it('passes through an already-correct YYYY-MM-DD string unchanged', () => {
    // This is the timezone-sensitive case: round-tripping through `new Date()` here would
    // shift the day for any timezone behind UTC.
    expect(toIsoDateString('2013-05-01')).toBe('2013-05-01');
  });

  it('converts a Date object to YYYY-MM-DD in local time', () => {
    expect(toIsoDateString(new Date(2013, 4, 1))).toBe('2013-05-01');
  });

  it('pads single-digit month and day', () => {
    expect(toIsoDateString(new Date(2013, 0, 5))).toBe('2013-01-05');
  });

  it('returns an empty string for a string that cannot be parsed as a date', () => {
    expect(toIsoDateString('not-a-date')).toBe('');
  });

  it('returns an empty string for an invalid Date object', () => {
    expect(toIsoDateString(new Date('invalid'))).toBe('');
  });
});
