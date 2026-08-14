import { formatAdminDate, formatCurrency, formatDateTime, formatNumber } from '@lib/i18n';
import { getTextDirection, loadMessages } from '@lib/i18n/server';

function normaliseSpaces(value: string) {
  return value.replace(/\s/gu, ' ');
}

describe('loadMessages', () => {
  it('loads the requested locale when translation files exist', async () => {
    const result = await loadMessages('en-ZA');

    expect(result.locale).toBe('en-ZA');
    expect(result.messages.clubs['page.title']).toBe('Clubs');
    expect(result.messages.nav.dashboard).toBe('Dashboard');
    expect(result.messages.errors['club.name.required']).toBe('Name is required');
    expect(result.messages.errors['club.toast.deleteFailed']).toBe(
      'Failed to delete club. Please try again.',
    );
    expect(result.messages.errors['club.notFound']).toBeDefined();
  });

  it('falls back to the default locale when the locale is missing', async () => {
    const result = await loadMessages('fr-FR');

    expect(result.locale).toBe('en-ZA');
    expect(result.messages.clubs['page.title']).toBe('Clubs');
  });
});

describe('formatters', () => {
  it('formats values with Intl helpers for the active locale', () => {
    expect(formatDateTime('2026-04-07T00:00:00.000Z', 'en-ZA')).toBe('07/04/2026');

    expect(normaliseSpaces(formatNumber(12345.67, 'en-ZA'))).toBe('12 345,67');
    expect(formatCurrency(12345.67, 'ZAR', 'en-ZA')).toContain('R');
    expect(formatAdminDate('2026-04-07T00:00:00.000Z', 'en-ZA')).toBe('07/04/2026');
  });

  it('derives text direction from the locale', () => {
    expect(getTextDirection('en-ZA')).toBe('ltr');
    expect(getTextDirection('ar-SA')).toBe('rtl');
  });
});
