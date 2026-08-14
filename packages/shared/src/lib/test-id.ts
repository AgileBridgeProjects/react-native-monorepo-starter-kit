/**
 * Converts a human-readable label into a deterministic, kebab-case test ID.
 *
 * @param label - The display string to slugify (e.g. "My Rewards").
 * @param role  - Optional suffix describing the element's role (e.g. "title", "button").
 *
 * @example
 * toTestId('My Rewards')           // → 'my-rewards'
 * toTestId('My Rewards', 'title')  // → 'my-rewards-title'
 * toTestId('Sign In', 'button')    // → 'sign-in-button'
 */
export function toTestId(label: string, role?: string): string {
  const slug = label.toLowerCase().replace(/\s+/g, '-');
  return role ? `${slug}-${role}` : slug;
}
