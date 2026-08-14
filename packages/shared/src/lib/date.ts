/**
 * Parses a date string as local midnight of the day it represents.
 *
 * Date-only strings (`"yyyy-MM-dd"`) are parsed by parts — `new Date(str)`
 * would treat them as UTC and shift to the previous day in UTC+ timezones.
 * Datetime strings are parsed by `Date` (which applies any `Z`/offset) and
 * then collapsed to the local calendar day, so a stored UTC instant like
 * `2026-06-11T22:00:00Z` correctly resolves to June 12 in UTC+2.
 */
export function parseLocalDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(dateStr);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

/** Strips the time component, returning local midnight of the same day. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** The last instant of the same local day (23:59:59.999) — for a "due by end of day X" value
 * that must still compare as not-yet-overdue for the whole of that day. */
export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Adds whole days in local time (DST-safe, unlike millisecond arithmetic). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** First day of the month containing `date`. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Last day of the month containing `date`. */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Local-date equality, ignoring time. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** ISO `yyyy-MM-dd` string for a local date, safe as a React key or API value. */
export function toDayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
