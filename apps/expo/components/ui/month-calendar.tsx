import { DEFAULT_LOCALE, endOfMonth, isSameDay, startOfMonth } from '@starterkit/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { CALENDAR_DAYS_IN_WEEK, DEFAULT_FIRST_DAY_OF_WEEK } from '@/components/ui/calendar.config';
import { CALENDAR_COLUMN_PERCENT, CalendarDayCell } from '@/components/ui/calendar-day-cell';
import { CalendarWeekdayHeader } from '@/components/ui/calendar-weekday-header';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/src/lib/cn';

export interface MonthCalendarProps {
  /** Any date inside the month to render. */
  month: Date;
  /** Drawn behind each day's number — a marker, a dot, whatever the caller needs. */
  renderDayBackground?: (date: Date) => ReactNode;
  /** Called for days the caller has not disabled. */
  onSelectDay?: (date: Date) => void;
  /** Return false to grey a day out and make it unpressable (e.g. outside a range). */
  isDayEnabled?: (date: Date) => boolean;
  /** Day currently highlighted, if any. */
  selectedDate?: Date | null;
  /** Accessible name per day; falls back to the date itself. */
  getDayAccessibilityLabel?: (date: Date) => string;
  /** Colour for a day's number, when the marker behind it changes what stays readable. */
  getDayNumberColor?: (date: Date) => string | undefined;
  locale?: string;
  /** 0 = Sunday. Defaults to Monday, matching en-ZA. */
  firstDayOfWeek?: number;
  className?: string;
  testID?: string;
}

/**
 * A presentational month grid.
 *
 * Deliberately knows nothing about what it is displaying — the caller decorates each day
 * through `renderDayBackground`, so the same grid serves emotion history, attendance, fixtures
 * or anything else. It owns only the calendar maths: which weekday a month starts on, how many
 * days it has, and the leading blanks needed to line the first row up.
 */
export function MonthCalendar({
  month,
  renderDayBackground,
  onSelectDay,
  isDayEnabled,
  selectedDate,
  getDayAccessibilityLabel,
  getDayNumberColor,
  locale = DEFAULT_LOCALE,
  firstDayOfWeek = DEFAULT_FIRST_DAY_OF_WEEK,
  className,
  testID,
}: MonthCalendarProps) {
  const first = startOfMonth(month);
  const daysInMonth = endOfMonth(month).getDate();
  // Rotated so the grid can start on any weekday without the first row drifting.
  const leadingBlanks =
    (first.getDay() - firstDayOfWeek + CALENDAR_DAYS_IN_WEEK) % CALENDAR_DAYS_IN_WEEK;
  const year = first.getFullYear();
  const monthIndex = first.getMonth();

  // Blanks carry the real date they stand in for (the tail of the previous month), so every
  // cell has a stable identity rather than being keyed by position.
  const cells: Array<{ date: Date; inMonth: boolean }> = [
    ...Array.from({ length: leadingBlanks }, (_, index) => ({
      date: new Date(year, monthIndex, index - leadingBlanks + 1),
      inMonth: false,
    })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({
      date: new Date(year, monthIndex, index + 1),
      inMonth: true,
    })),
  ];

  // Built outside the JSX. A blank is not a placeholder for a false branch — it still occupies
  // a column, which is what lines the first week up under the right weekday.
  const dayCells = cells.map(({ date, inMonth }) => {
    if (!inMonth) {
      return (
        <View
          key={date.toISOString()}
          // A computed share of the row; no static class can express it.
          style={{ width: `${CALENDAR_COLUMN_PERCENT}%` }}
        />
      );
    }

    return (
      <CalendarDayCell
        key={date.toISOString()}
        date={date}
        widthPercent={CALENDAR_COLUMN_PERCENT}
        renderBackground={renderDayBackground}
        onPress={onSelectDay}
        enabled={isDayEnabled ? isDayEnabled(date) : true}
        selected={selectedDate ? isSameDay(date, selectedDate) : false}
        accessibilityLabel={getDayAccessibilityLabel?.(date)}
        numberColor={getDayNumberColor?.(date)}
      />
    );
  });

  return (
    <View className={cn('gap-xs', className)} testID={testID}>
      <Typography variant="label" className="text-center text-white/70">
        {month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
      </Typography>

      <CalendarWeekdayHeader locale={locale} firstDayOfWeek={firstDayOfWeek} />

      <View className="flex-row flex-wrap">{dayCells}</View>
    </View>
  );
}
