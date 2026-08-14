/**
 * Converts a DevExtreme `DateBox` value (`Date | string | null`) to an ISO "YYYY-MM-DD" string.
 *
 * Date-only strings (e.g. echoed back from the API) already round-trip correctly — parsing
 * them via `new Date()` would read them as UTC midnight, then `getFullYear()`/`getDate()`
 * read back in local time, shifting the day for any timezone behind UTC.
 */
export function toIsoDateString(value: Date | string | null): string {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
