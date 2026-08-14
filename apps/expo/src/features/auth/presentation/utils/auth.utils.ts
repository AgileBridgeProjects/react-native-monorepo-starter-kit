/**
 * Returns the first two initials of a name, uppercased. Used for avatar placeholders.
 *
 * Words with no letters (a jersey number like "#10", stray punctuation) are skipped rather than
 * contributing a garbage initial — some rosters store the jersey number directly in the display
 * name (e.g. "#10 Jadyn Grant-Dial"), which used to produce "#J" instead of "JG".
 */
export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .filter((part) => /\p{L}/u.test(part))
    .map((part) => part.match(/\p{L}/u)?.[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
