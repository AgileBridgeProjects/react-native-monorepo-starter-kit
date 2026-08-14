/**
 * Small static mock factories shared across test files. None of these reference
 * test-file variables, so they're safe to call directly inside a hoisted
 * `vi.mock` factory:
 *
 *   vi.mock('@lib/i18n', () => i18nPassthrough());
 *   vi.mock('@/constants/tokens', () => tokensMock());
 *   vi.mock('@/components/ui/icon', () => iconMock());
 *
 * Router mocks are intentionally NOT here — they reference per-test spy fns and
 * must be declared inline so the spies are read lazily at render time (avoids TDZ).
 */

/** i18n hook that returns the translation key verbatim (params ignored). */
export function i18nPassthrough() {
  return {
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: 'en', changeLanguage: () => Promise.resolve() },
    }),
    // Real Intl formatting (fixed locale) rather than a stub — several feature date utils
    // (e.g. format-calendar-time.ts) delegate straight to this instead of formatting inline.
    formatDateTime: (
      value: Date | number | string,
      _locale?: string,
      options?: Intl.DateTimeFormatOptions,
    ) => new Intl.DateTimeFormat('en-ZA', options).format(new Date(value)),
  };
}

/** Comprehensive token mock covering the values feature code reads at runtime. */
export function tokensMock() {
  const palette = {
    neutral: { 50: '#fafafa', 100: '#f5f5f5', 400: '#9ca3af', 500: '#6b7280', 900: '#111827' },
    status: { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
    primary: { 500: '#6d28d9' },
    // Brand swatches read at runtime by screens on the navy gradient (stats-import, auth).
    white: {
      DEFAULT: '#ffffff',
      10: 'rgba(255,255,255,0.1)',
      20: 'rgba(255,255,255,0.2)',
      50: 'rgba(255,255,255,0.5)',
      60: 'rgba(255,255,255,0.6)',
    },
    cyan: { DEFAULT: '#3bd7f6', light: '#a9f1ff' },
    blue: { inputFill: '#032158', cardDark: '#0a1c40', screen: '#010d28' },
  };
  const colors = {
    light: { primary: '#6d28d9', primaryForeground: '#fff', icon: '#555', background: '#fff' },
    dark: { primary: '#a78bfa', primaryForeground: '#000', icon: '#aaa', background: '#000' },
  };
  return {
    iconSize: { xs: 12, sm: 16, md: 20, lg: 24, xl: 32 },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64 },
    shadows: {
      sm: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
      md: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
      card: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
    },
    palette,
    colors,
  };
}

/** Icon module mock (the standalone `@/components/ui/icon` import path). */
export function iconMock() {
  return { Icon: () => null, IconSymbol: () => null };
}
