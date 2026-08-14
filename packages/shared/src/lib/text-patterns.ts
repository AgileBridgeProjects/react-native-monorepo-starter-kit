/**
 * Shared text-matching patterns.
 *
 * Kept out of the components that use them so a pattern is defined once and can be tested
 * on its own — regexes embedded in render code get quietly duplicated and drift.
 */

/**
 * Matches an http(s) URL run inside a larger body of text.
 *
 * Deliberately NOT declared with the `g` flag. A global regex carries mutable `lastIndex`
 * state, so a shared instance gives different answers to `.test()` on successive calls with
 * the same input — which silently mislinkifies chat messages. Callers that need to split on
 * every occurrence build their own global copy via {@link globalUrlPattern}.
 */
export const URL_PATTERN = /https?:\/\/[^\s]+/;

/**
 * A fresh global-flagged copy of {@link URL_PATTERN} for `String.split`/`matchAll`.
 *
 * The source is wrapped in a **capture group**, which `String.split` requires in order to
 * keep the separators: split on an uncaptured pattern discards every match, so linkifying
 * would drop the URLs out of the text entirely rather than turning them into links.
 *
 * A new instance per call, so `lastIndex` is never shared between callers.
 */
export function globalUrlPattern(): RegExp {
  return new RegExp(`(${URL_PATTERN.source})`, 'g');
}

/** True when the whole string is a single http(s) URL and nothing else. */
export function isUrl(value: string): boolean {
  return new RegExp(`^${URL_PATTERN.source}$`).test(value);
}
