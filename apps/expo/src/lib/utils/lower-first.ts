/**
 * Lowercases the first character only, leaving the rest untouched.
 *
 * Maps a PascalCase proxy enum member (`MiddleBlocker`) to its camelCase locale key
 * (`indicators.position.middleBlocker`), which is how every enum-driven label in the app is
 * looked up. Not a general-purpose case converter — it does not touch word boundaries.
 */
export function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}
