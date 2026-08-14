/**
 * Display-name validation and parsing utilities.
 *
 * Centralised so web, mobile, and backend all use the same rules.
 */

/** Allows letters, spaces, hyphens, and apostrophes (e.g. "O'Brien", "Mary-Jane"). */
export const NAME_REGEX = /^[A-Za-z\s\-']+$/;

/** Split "Bonnie Green" → `{ firstName: "Bonnie", lastName: "Green" }` */
export function splitName(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = displayName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

/** Join first + last name into a single trimmed display name. */
export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}
