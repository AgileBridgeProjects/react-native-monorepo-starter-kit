/**
 * Non-sizing calendar constants shared by the day cell, the month grid, the week strip and the
 * weekday header. Sizing values (cell dimensions, column widths) stay next to the JSX that
 * uses them — see `CALENDAR_DAY_SIZE` / `CALENDAR_COLUMN_PERCENT` in `calendar-day-cell.tsx`.
 */

/** Columns in any calendar row. Shared so the grid, the strip and the header cannot disagree. */
export const CALENDAR_DAYS_IN_WEEK = 7;

/** 1 = Monday, matching en-ZA. */
export const DEFAULT_FIRST_DAY_OF_WEEK = 1;

/** 2024-01-07 is a Sunday, so adding a weekday index lands on each day in turn. */
export const KNOWN_SUNDAY = new Date(2024, 0, 7);
