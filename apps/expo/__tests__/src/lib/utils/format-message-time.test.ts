import { describe, expect, it } from 'vitest';
import {
  formatClockTime,
  formatConversationTime,
  formatDayLabel,
  isDifferentDay,
} from '@/src/lib/utils/format-message-time';

// Fixed reference instant so nothing here depends on the wall clock.
const NOW = new Date(2026, 6, 28, 13, 40, 0); // 28 Jul 2026, 13:40 local (a Tuesday)
const at = (day: number, hour: number, minute = 0) => new Date(2026, 6, day, hour, minute);

// The labels are injected from i18n in the app; fixed here so wording stays asserted.
const LABELS = { today: 'Today', yesterday: 'Yesterday' };

describe('formatClockTime', () => {
  it('renders a 24-hour clock stamp', () => {
    expect(formatClockTime(at(28, 13, 32))).toBe('13:32');
  });

  it('zero-pads the hour so stamps align in a column', () => {
    expect(formatClockTime(at(28, 9, 5))).toBe('09:05');
  });

  it('uses 24-hour form past midday rather than a meridiem', () => {
    const stamp = formatClockTime(at(28, 23, 59));
    expect(stamp).toBe('23:59');
    expect(stamp).not.toMatch(/[ap]m/i);
  });

  it('returns an empty string for an unparseable value', () => {
    expect(formatClockTime('not a date')).toBe('');
  });
});

describe('formatDayLabel', () => {
  it('labels today and yesterday by name', () => {
    expect(formatDayLabel(at(28, 8), LABELS, NOW)).toBe('Today');
    expect(formatDayLabel(at(27, 8), LABELS, NOW)).toBe('Yesterday');
  });

  it('treats "today" by calendar day, not by elapsed hours', () => {
    // 00:05 today is only ~13h before NOW but is still Today; 23:00 yesterday is
    // ~14h before NOW and must not be.
    expect(formatDayLabel(at(28, 0, 5), LABELS, NOW)).toBe('Today');
    expect(formatDayLabel(at(27, 23), LABELS, NOW)).toBe('Yesterday');
  });

  it('names the weekday within the last week', () => {
    expect(formatDayLabel(at(24, 10), LABELS, NOW)).toBe('Friday');
  });

  it('falls back to a full date beyond a week', () => {
    expect(formatDayLabel(at(10, 10), LABELS, NOW)).toBe('10 July');
  });
});

describe('formatConversationTime', () => {
  it('shows the clock for today and a name for yesterday', () => {
    expect(formatConversationTime(at(28, 11, 37), LABELS.yesterday, NOW)).toBe('11:37');
    expect(formatConversationTime(at(27, 11, 37), LABELS.yesterday, NOW)).toBe('Yesterday');
  });

  it('shows a short weekday within the last week, then a short date', () => {
    expect(formatConversationTime(at(24, 10), LABELS.yesterday, NOW)).toBe('Fri');
    expect(formatConversationTime(at(10, 10), LABELS.yesterday, NOW)).toBe('10 Jul');
  });

  it('includes the year once the message is from another year', () => {
    expect(formatConversationTime(new Date(2025, 10, 3, 9, 0), LABELS.yesterday, NOW)).toContain(
      '25',
    );
  });
});

describe('isDifferentDay', () => {
  it('is true across a midnight boundary and false within one day', () => {
    expect(isDifferentDay(at(28, 0, 1), at(27, 23, 59))).toBe(true);
    expect(isDifferentDay(at(28, 0, 1), at(28, 23, 59))).toBe(false);
  });

  it('treats a missing comparison as a new day, so the first message gets a pill', () => {
    expect(isDifferentDay(at(28, 9), null)).toBe(true);
    expect(isDifferentDay(at(28, 9), undefined)).toBe(true);
  });
});
