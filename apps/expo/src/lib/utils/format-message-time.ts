import { DEFAULT_LOCALE } from '@starterkit/shared';

/**
 * Chat timestamp formatting, following WhatsApp's scheme:
 *
 * - inside a bubble: the clock time, always, in 24-hour form ("13:32")
 * - between bubbles: a day-separator pill ("Today" / "Yesterday" / "28 July 2026")
 * - in the conversation list: clock time for today, "Yesterday", else a short date
 *
 * Absolute stamps rather than relative phrases, so nothing has to re-render on a
 * timer to stay truthful.
 */

const toDate = (value: Date | number | string): Date | null => {
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Whole-day difference between two instants, ignoring the time of day. */
const dayDelta = (a: Date, b: Date): number => {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(b) - startOfDay(a)) / 86_400_000);
};

/** "13:32" — 24-hour clock, no meridiem, stable regardless of device preference. */
export function formatClockTime(value: Date | number | string): string {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** Relative day names the caller supplies from i18n, so this stays translation-agnostic. */
export interface DayLabels {
  today: string;
  yesterday: string;
}

/**
 * Label for a day-separator pill: today/yesterday by name, a weekday inside the last
 * week ("Monday"), else a full date.
 *
 * `labels` is injected rather than hardcoded — every user-facing string in the app comes
 * from the `messages` namespace, and a literal 'Today' here could never be localized.
 */
export function formatDayLabel(
  value: Date | number | string,
  labels: DayLabels,
  nowValue: Date | number = Date.now(),
): string {
  const date = toDate(value);
  if (!date) return '';
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  const delta = dayDelta(date, now);

  if (delta <= 0) return labels.today;
  if (delta === 1) return labels.yesterday;
  if (delta < 7) return new Intl.DateTimeFormat(DEFAULT_LOCALE, { weekday: 'long' }).format(date);
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  }).format(date);
}

/**
 * Conversation-list stamp: the clock for today's messages, "Yesterday" for
 * yesterday's, a weekday inside the last week, else a short date.
 */
export function formatConversationTime(
  value: Date | number | string,
  yesterdayLabel: string,
  nowValue: Date | number = Date.now(),
): string {
  const date = toDate(value);
  if (!date) return '';
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  const delta = dayDelta(date, now);

  if (delta <= 0) return formatClockTime(date);
  if (delta === 1) return yesterdayLabel;
  if (delta < 7) return new Intl.DateTimeFormat(DEFAULT_LOCALE, { weekday: 'short' }).format(date);
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: '2-digit' }),
  }).format(date);
}

/** True when the two timestamps fall on different calendar days (day-pill boundary). */
export function isDifferentDay(
  a: Date | number | string,
  b: Date | number | string | null | undefined,
): boolean {
  const first = toDate(a);
  if (!first) return false;
  if (b === null || b === undefined) return true;
  const second = toDate(b);
  if (!second) return true;
  return dayDelta(first, second) !== 0;
}
