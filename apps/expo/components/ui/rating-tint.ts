import { palette } from '@/constants/tokens';

/**
 * The shared vocabulary of the rating steps' colour language, in a neutral
 * module so the MegaSlider (which drives the value) and the runner's
 * ScreenTint (which paints the whole screen with it) depend on the same facts
 * without depending on each other.
 */

/**
 * Negative (red) through neutral (amber) to positive (green) — the track fill
 * and the ambient screen tint both ride this ramp so the whole screen "feels"
 * the value as the thumb sweeps it.
 */
export const RATING_VALUE_STOPS = [
  palette.status.error,
  palette.amber.DEFAULT,
  palette.green.DEFAULT,
];

/** Interpolation positions matching {@link RATING_VALUE_STOPS}. */
export const RATING_STOP_POSITIONS = [0, 0.5, 1];

/** Sentinel for "no value chosen yet" on the shared tint channel. */
export const TINT_INACTIVE = -1;
