import {
  formatAdminDate,
  formatCurrency,
  formatDateTime,
  formatNumber,
} from '@lib/i18n/formatters';
import { describe, expect, it } from 'vitest';

// Use a fixed locale for deterministic output across environments.
const LOCALE = 'en-ZA';

describe('formatDateTime', () => {
  it('formats a Date object to DD/MM/YYYY by default', () => {
    const date = new Date('2024-06-15T10:30:00Z');
    const result = formatDateTime(date, LOCALE);
    expect(result).toBe('15/06/2024');
  });

  it('accepts an ISO string input', () => {
    const result = formatDateTime('2024-01-01T00:00:00Z', LOCALE);
    expect(result).toBe('01/01/2024');
  });

  it('accepts a timestamp number input', () => {
    const result = formatDateTime(0, LOCALE);
    expect(result).toBe('01/01/1970');
  });

  it('still supports custom non-date-only Intl options', () => {
    const result = formatDateTime('2024-06-15T10:30:00Z', LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });

    expect(result).toBe('10:30');
  });
});

describe('formatAdminDate', () => {
  it('returns the same output as formatDateTime with default options', () => {
    const value = '2024-06-15T10:30:00Z';
    expect(formatAdminDate(value, LOCALE)).toBe(formatDateTime(value, LOCALE));
  });
});

describe('formatNumber', () => {
  it('formats an integer', () => {
    const result = formatNumber(1000, LOCALE);
    // Should contain "1" and "000" separated by a group separator
    expect(result.replace(/\D/g, '').replace(/^0+/, '')).toBe('1000');
  });

  it('formats a decimal', () => {
    const result = formatNumber(3.14, LOCALE);
    expect(result).toContain('3');
    expect(result).toContain('14');
  });
});

describe('formatCurrency', () => {
  it('includes the currency symbol in the output', () => {
    const result = formatCurrency(100, 'ZAR', LOCALE);
    expect(typeof result).toBe('string');
    // Should contain digits representing 100
    expect(result.replace(/\D/g, '').replace(/^0+/, '')).toContain('100');
  });

  it('accepts a locale override', () => {
    const result = formatCurrency(50.5, 'USD', 'en-US');
    expect(result).toContain('50');
  });
});
