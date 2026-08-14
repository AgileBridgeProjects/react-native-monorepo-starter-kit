/**
 * Coerces an Orval `number | string` field to a plain number.
 * Returns `fallback` for absent or non-numeric values.
 */
export function toNumber(value: number | string | null | undefined, fallback = 0): number {
  if (value == null) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Coerces an Orval `number | string | null | undefined` field to
 * `number | null`. Treats `null`, `undefined`, and non-numeric values as absent.
 */
export function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}
