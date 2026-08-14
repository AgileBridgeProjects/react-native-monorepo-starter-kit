/**
 * Returns the active color scheme for web.
 *
 * StarterKit ships dark-mode only (see the native `use-color-scheme.ts` for the
 * full rationale) — always dark, regardless of the persisted `app-store`
 * preference or OS setting.
 */
export function useColorScheme(): 'light' | 'dark' {
  return 'dark';
}
