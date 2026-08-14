import { addDays, DEFAULT_LOCALE } from '@starterkit/shared';
import { View } from 'react-native';
import {
  CALENDAR_DAYS_IN_WEEK,
  DEFAULT_FIRST_DAY_OF_WEEK,
  KNOWN_SUNDAY,
} from '@/components/ui/calendar.config';
import { Typography } from '@/components/ui/typography';

export interface CalendarWeekdayHeaderProps {
  locale?: string;
  /** 0 = Sunday. */
  firstDayOfWeek?: number;
}

/** The narrow weekday initials above a calendar's columns. */
export function CalendarWeekdayHeader({
  locale = DEFAULT_LOCALE,
  firstDayOfWeek = DEFAULT_FIRST_DAY_OF_WEEK,
}: CalendarWeekdayHeaderProps) {
  const labels = Array.from({ length: CALENDAR_DAYS_IN_WEEK }, (_, index) => {
    const weekday = (firstDayOfWeek + index) % CALENDAR_DAYS_IN_WEEK;
    return {
      weekday,
      label: addDays(KNOWN_SUNDAY, weekday).toLocaleDateString(locale, { weekday: 'narrow' }),
    };
  });

  return (
    <View className="flex-row">
      {labels.map(({ weekday, label }) => (
        <View key={weekday} className="flex-1 items-center">
          <Typography variant="caption" className="text-white/40">
            {label}
          </Typography>
        </View>
      ))}
    </View>
  );
}
