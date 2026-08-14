import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { CALENDAR_DAYS_IN_WEEK } from '@/components/ui/calendar.config';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/src/lib/cn';

/**
 * Height of one day cell. Deliberately tight — a 30-day calendar has to fit on screen without
 * scrolling, and the date sits *inside* its marker rather than under it, so the row only needs
 * to be as tall as the marker itself.
 */
export const CALENDAR_DAY_SIZE = 34;

/** One column's share of a calendar row, so a week always divides evenly. */
export const CALENDAR_COLUMN_PERCENT = 100 / CALENDAR_DAYS_IN_WEEK;

export interface CalendarDayCellProps {
  date: Date;
  /**
   * Drawn *behind* the date, centred. The date number is always rendered by this cell, so a
   * marker decorates the day rather than displacing it.
   */
  renderBackground?: (date: Date) => ReactNode;
  onPress?: (date: Date) => void;
  enabled?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
  /** Overrides the date's colour — needed when a marker behind it changes what is readable. */
  numberColor?: string;
  /** Column width as a percentage, so a week always divides evenly. */
  widthPercent: number;
}

/**
 * One day in a calendar — shared by {@link MonthCalendar} and {@link CalendarWeekStrip} so both
 * lay a day out identically.
 */
export function CalendarDayCell({
  date,
  renderBackground,
  onPress,
  enabled = true,
  selected = false,
  accessibilityLabel,
  numberColor,
  widthPercent,
}: CalendarDayCellProps) {
  const pressable = enabled && Boolean(onPress);

  return (
    <Pressable
      className="items-center justify-center"
      style={{ width: `${widthPercent}%`, height: CALENDAR_DAY_SIZE }}
      onPress={pressable ? () => onPress?.(date) : undefined}
      disabled={!pressable}
      // CALENDAR_DAY_SIZE (34) is below the 44pt minimum touch target, but the shared
      // `touch-target` class is not the fix here — it sets min-h/min-w, which would grow the
      // cell itself and break the tight 30-day grid this size exists for. hitSlop expands only
      // the hit-testing bounds, not layout, giving the same 44pt+ target without that cost.
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? date.toDateString()}
      accessibilityState={{ selected, disabled: !pressable }}
    >
      <View
        className="items-center justify-center"
        style={{ width: CALENDAR_DAY_SIZE, height: CALENDAR_DAY_SIZE }}
      >
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          {renderBackground?.(date)}
        </View>
        <Typography
          variant="caption"
          className={cn(
            !numberColor && 'text-white/70',
            !enabled && 'text-white/25',
            selected && 'font-body-bold',
          )}
          style={numberColor ? { color: numberColor } : undefined}
        >
          {date.getDate()}
        </Typography>
      </View>
    </Pressable>
  );
}
