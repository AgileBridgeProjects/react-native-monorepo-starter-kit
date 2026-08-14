const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ps', 'ur']);

export function getTextDirection(locale: string) {
  try {
    const direction = (
      new Intl.Locale(locale) as Intl.Locale & {
        textInfo?: {
          direction?: string;
        };
      }
    ).textInfo?.direction;
    return direction === 'rtl' ? 'rtl' : 'ltr';
  } catch {
    const language = locale.split('-')[0]?.toLowerCase();
    return language && RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
  }
}
