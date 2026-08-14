import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-ZA' }],
}));

describe('i18n', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('registers the home namespace translations', async () => {
    const { i18n } = await import('@lib/i18n');

    expect(i18n.t('home:greeting')).toBe('Welcome back');
    expect(i18n.t('home:greetingName', { name: 'Jane' })).toBe('Welcome, Jane');
    expect(i18n.t('home:placeholderTitle')).toBe('Your home screen');
  });

  it('registers the titles namespace translations', async () => {
    const { i18n } = await import('@lib/i18n');

    expect(i18n.t('titles:nav.home')).toBe('Home');
    expect(i18n.t('titles:settings')).toBe('Settings');
  });
});
