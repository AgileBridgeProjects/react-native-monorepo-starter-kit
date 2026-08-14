import { useAppStore } from '@store/app-store';
import { useReducedMotion as useOsReducedMotion } from 'react-native-reanimated';

/**
 * Single source of truth for whether motion should be reduced.
 *
 * Returns `true` when EITHER:
 * - the user enabled the in-app "Reduce motion" setting (for low-end devices
 *   where the OS preference may not be set), or
 * - the OS-level reduce-motion accessibility preference is on (read via
 *   Reanimated's own detector, so it stays consistent with the layout-animation
 *   `ReduceMotion` config).
 *
 * Consume this to skip or simplify non-essential animations. Animations that
 * convey essential feedback (e.g. correct/incorrect answers) should still
 * render — just without the decorative pulse/scale.
 *
 * NOTE: Always import `useReducedMotion` from here, never directly from
 * `react-native-reanimated`, so the in-app toggle is respected everywhere.
 */
export function useReducedMotion(): boolean {
  const userPref = useAppStore((s) => s.reduceMotion);
  const osPref = useOsReducedMotion();
  return userPref || osPref;
}
