import { useAppStore } from '@store/app-store';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * StarterKit ships dark-mode only. Every screen is designed against the dark
 * token set (`colors.dark` in constants/tokens.ts); there is no light-mode
 * design to fall back to. We force dark regardless of the OS / stored
 * preference so themed surfaces stay consistent — the Settings "Dark mode"
 * toggle is locked on to reflect this (see settings-screen.tsx).
 *
 * Typed as `boolean` so the preference logic below stays reachable / lint-clean.
 */
const FORCE_DARK_MODE: boolean = true;

/**
 * Returns the active color scheme.
 *
 * - `'system'` (default on first launch): follows the OS preference.
 * - `'light'` / `'dark'`: explicit user override via Settings.
 */
export function useColorScheme(): 'light' | 'dark' {
  const stored = useAppStore((s) => s.colorScheme);
  const system = useRNColorScheme();
  if (FORCE_DARK_MODE) return 'dark';
  if (stored === 'system') return system === 'dark' ? 'dark' : 'light';
  return stored === 'dark' ? 'dark' : 'light';
}
