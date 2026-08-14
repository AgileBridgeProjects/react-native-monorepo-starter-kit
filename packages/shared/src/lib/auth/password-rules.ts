// ─── Password complexity rules ───────────────────────────────────────────────
// Shared between web and mobile setup-account pages.
// Must stay in sync with backend AccountSetupHelper validation (≥6 chars,
// upper, lower, digit, special).

export const PASSWORD_MIN_LENGTH = 6;

const SPECIAL_CHAR_PATTERN = /[!@#$%^&*()\-_=+[\]{};:'",.<>?/\\|`~]/;

/** Combined regex that validates all rules in a single pass (for Zod `.refine`). */
export const PASSWORD_COMPLEXITY = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*${SPECIAL_CHAR_PATTERN.source}).{${PASSWORD_MIN_LENGTH},}$`,
);

/**
 * Individual password rules for rendering a live checklist.
 * Each rule has a `key` for stable React keys and a `test` function.
 * The consumer provides the translated `label` via its own i18n namespace.
 */
export const PASSWORD_RULES = [
  { key: 'minLength', test: (v: string) => v.length >= PASSWORD_MIN_LENGTH },
  { key: 'uppercase', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lowercase', test: (v: string) => /[a-z]/.test(v) },
  { key: 'number', test: (v: string) => /\d/.test(v) },
  { key: 'special', test: (v: string) => SPECIAL_CHAR_PATTERN.test(v) },
] as const;
