import {
  formatAdminDate,
  formatCurrency,
  formatDateTime,
  formatNumber,
} from '@lib/i18n/formatters';
import i18n from 'i18next';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// adminDateOptions === { day: '2-digit', month: 'short', year: 'numeric' }
// DEFAULT_LOCALE === 'en-ZA'. The short-month abbreviation is ICU-version dependent
// ("Sep" vs "Sept"), so date assertions stay structural.
const ADMIN_DATE_PATTERN = /^\d{2}\s+[A-Za-z.]+\s+\d{4}$/;
const SAMPLE = new Date('2026-09-05T12:00:00');

describe('formatters', () => {
  beforeEach(() => {
    // Clear i18n.language so getLocale() falls through to DEFAULT_LOCALE (en-ZA).
    // Must be undefined, not '' — the ?? chain only falls back on null/undefined,
    // and Intl rejects an empty-string locale.
    (i18n as { language?: string }).language = undefined;
  });

  afterEach(() => {
    (i18n as { language?: string }).language = undefined;
  });

  describe('formatDateTime', () => {
    it('formats a Date with the default admin options under the fallback locale', () => {
      const result = formatDateTime(SAMPLE);
      expect(result).toMatch(ADMIN_DATE_PATTERN);
      expect(result.startsWith('05 ')).toBeTruthy();
      expect(result.endsWith('2026')).toBeTruthy();
    });

    it('accepts string and number inputs equivalently', () => {
      const fromString = formatDateTime('2026-09-05T12:00:00');
      const fromNumber = formatDateTime(SAMPLE.getTime());
      expect(fromString).toBe(formatDateTime(SAMPLE));
      expect(fromNumber).toBe(formatDateTime(SAMPLE));
    });

    it('honours an explicit locale override', () => {
      const result = formatDateTime(SAMPLE, 'en-US', { year: 'numeric', month: 'numeric' });
      // en-US numeric month/year renders as M/YYYY.
      expect(result).toBe('9/2026');
    });

    it('honours custom Intl options', () => {
      const result = formatDateTime(SAMPLE, 'en-ZA', { year: 'numeric' });
      expect(result).toBe('2026');
    });

    it('uses i18n.language when no explicit locale is given', () => {
      i18n.language = 'en-US';
      const result = formatDateTime(SAMPLE, undefined, { year: 'numeric', month: 'numeric' });
      expect(result).toBe('9/2026');
    });
  });

  describe('formatAdminDate', () => {
    it('delegates to formatDateTime with the admin options', () => {
      expect(formatAdminDate(SAMPLE)).toBe(formatDateTime(SAMPLE));
    });

    it('passes through a locale override', () => {
      expect(formatAdminDate(SAMPLE, 'en-US')).toBe(formatDateTime(SAMPLE, 'en-US'));
    });
  });

  describe('formatNumber', () => {
    it('groups thousands and renders decimals under the fallback locale', () => {
      const result = formatNumber(1_234_567.89);
      expect(result).toContain('234');
      expect(result).toContain('567');
      // en-ZA uses a comma decimal separator.
      expect(result).toContain('89');
    });

    it('formats zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('formats negative numbers', () => {
      expect(formatNumber(-5)).toContain('5');
      expect(formatNumber(-5).startsWith('-')).toBeTruthy();
    });

    it('respects a locale override (en-US uses a dot decimal and comma grouping)', () => {
      expect(formatNumber(1234.5, 'en-US')).toBe('1,234.5');
    });

    it('respects Intl number options (minimumFractionDigits)', () => {
      expect(formatNumber(5, 'en-US', { minimumFractionDigits: 2 })).toBe('5.00');
    });

    it('uses i18n.language as the locale when none is passed', () => {
      i18n.language = 'en-US';
      expect(formatNumber(1234.5)).toBe('1,234.5');
    });
  });

  describe('formatCurrency', () => {
    it('renders a USD amount with the dollar symbol under en-US', () => {
      expect(formatCurrency(1234.5, 'USD', 'en-US')).toBe('$1,234.50');
    });

    it('renders a ZAR amount containing the rand symbol and grouped digits', () => {
      const result = formatCurrency(1234.5, 'ZAR', 'en-ZA');
      expect(result).toContain('R');
      expect(result).toContain('234');
    });

    it('merges extra Intl options over the currency style', () => {
      const result = formatCurrency(1234.5, 'USD', 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      expect(result).toBe('$1,235');
    });

    it('formats zero currency', () => {
      expect(formatCurrency(0, 'USD', 'en-US')).toBe('$0.00');
    });

    it('falls back to i18n.language / default locale when no locale supplied', () => {
      i18n.language = 'en-US';
      expect(formatCurrency(10, 'USD')).toBe('$10.00');
    });
  });
});
