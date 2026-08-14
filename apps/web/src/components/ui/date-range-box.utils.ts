export type DateRangeValueTuple = [string | null, string | null];

export function normaliseDateValue(value: unknown): string | null {
  if (value == null || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())).toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00.000Z`;

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

export function normaliseRange(value?: unknown[]): DateRangeValueTuple {
  return [normaliseDateValue(value?.[0]), normaliseDateValue(value?.[1])];
}

export function areRangesEqual(left: DateRangeValueTuple, right: DateRangeValueTuple) {
  return left[0] === right[0] && left[1] === right[1];
}

/**
 * Truncates a `normaliseDateValue` ISO datetime string (e.g. "2026-07-21T00:00:00.000Z")
 * down to its date-only portion ("2026-07-21") — the shape .NET's `DateOnly` JSON
 * converter expects. Use this at the point a `DateRangeBox` value is sent to an API
 * that binds to `DateOnly`, not `DateTime`.
 */
export function toDateOnly(value: string): string {
  return value.slice(0, 10);
}
