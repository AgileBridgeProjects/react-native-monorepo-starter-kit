/**
 * Supported club-local periods for athlete emotion summaries, mirroring the backend's
 * `CheckInSummaryPeriods` (`apps/backend/src/StarterKit.Core/CheckIns/Helpers/CheckInSummaryPeriods.cs`).
 *
 * The server only accepts these two values for `days` — keeping them here rather than in a
 * feature folder means a client can't quietly offer a period the API would reject.
 */
export const CHECK_IN_SUMMARY_PERIODS = [7, 30] as const;

export type CheckInSummaryPeriod = (typeof CHECK_IN_SUMMARY_PERIODS)[number];

/** Mirrors `CheckInSummaryPeriods.DefaultDays` — the period used when the caller picks none. */
export const DEFAULT_CHECK_IN_SUMMARY_PERIOD: CheckInSummaryPeriod = 7;

/** Narrows an arbitrary number to a supported period, falling back to the default. */
export function toCheckInSummaryPeriod(value: number): CheckInSummaryPeriod {
  return CHECK_IN_SUMMARY_PERIODS.includes(value as CheckInSummaryPeriod)
    ? (value as CheckInSummaryPeriod)
    : DEFAULT_CHECK_IN_SUMMARY_PERIOD;
}
