import { addDays, DEFAULT_LOCALE, isSameDay } from '@starterkit/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { CALENDAR_DAYS_IN_WEEK } from '@/components/ui/calendar.config';
import { CALENDAR_COLUMN_PERCENT, CalendarDayCell } from '@/components/ui/calendar-day-cell';
import { CalendarWeekdayHeader } from '@/components/ui/calendar-weekday-header';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/src/lib/cn';

export interface CalendarWeekStripProps {
  /** Last day in the strip; the six days before it are shown ahead of it. */
  endDate: Date;
  /** Drawn behind each day's number. */
  renderDayBackground?: (date: Date) => ReactNode;
  onSelectDay?: (date: Date) => void;
  isDayEnabled?: (date: Date) => boolean;
  selectedDate?: Date | null;
  getDayAccessibilityLabel?: (date: Date) => string;
  /** Colour for a day's number, when the marker behind it changes what stays readable. */
  getDayNumberColor?: (date: Date) => string | undefined;
  locale?: string;
  className?: string;
  testID?: string;
}

/**
 * Seven consecutive days as a single row.
 *
 * For a one-week range a full month grid is mostly empty padding, and the week itself often
 * straddles two months — this shows exactly the seven days in question, crossing the month
 * boundary without comment. The heading names whichever month(s) the week covers.
 */
export function CalendarWeekStrip({
  endDate,
  renderDayBackground,
  onSelectDay,
  isDayEnabled,
  selectedDate,
  getDayAccessibilityLabel,
  getDayNumberColor,
  locale = DEFAULT_LOCALE,
  className,
  testID,
}: CalendarWeekStripProps) {
  const days = Array.from({ length: CALENDAR_DAYS_IN_WEEK }, (_, index) =>
    addDays(endDate, index - (CALENDAR_DAYS_IN_WEEK - 1)),
  );

  const first = days[0];
  const last = days[days.length - 1];
  const sameMonth = first.getMonth() === last.getMonth();
  const heading = sameMonth
    ? last.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    : `${first.toLocaleDateString(locale, { month: 'long' })} – ${last.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`;

  return (
    <View className={cn('gap-xs', className)} testID={testID}>
      <Typography variant="label" className="text-center text-white/70">
        {heading}
      </Typography>

      {/* Column initials follow the strip's own start day, not the locale's week start. */}
      <CalendarWeekdayHeader locale={locale} firstDayOfWeek={first.getDay()} />

      <View className="flex-row">
        {days.map((date) => (
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
        ))}
      </View>
    </View>
  );
}
