import { describe, expect, it, vi } from 'vitest';

import { CalendarWeekStrip } from '@/components/ui/calendar-week-strip';
import { firePress, renderTree, textChildren } from '@/test/utils/rtr';

const dayButtons = (root: ReturnType<typeof renderTree>['root']) =>
  root.findAll((node) => node.props.accessibilityRole === 'button');

describe('CalendarWeekStrip', () => {
  it('shows exactly seven days, ending on the given day', () => {
    const root = renderTree(<CalendarWeekStrip endDate={new Date(2026, 7, 12)} />).root;

    expect(dayButtons(root)).toHaveLength(7);
    // 6th through 12th August inclusive.
    for (const day of [6, 7, 8, 9, 10, 11, 12]) {
      expect(textChildren(root)).toContain(day);
    }
    expect(textChildren(root)).not.toContain(5);
  });

  it('crosses a month boundary without padding the row out', () => {
    // A week ending 2 September reaches back into August; the whole point of the strip is
    // that it shows those seven days rather than two mostly-empty month grids.
    const root = renderTree(<CalendarWeekStrip endDate={new Date(2026, 8, 2)} />).root;

    expect(dayButtons(root)).toHaveLength(7);
    expect(textChildren(root)).toContain(27);
    expect(textChildren(root)).toContain(2);
    expect(textChildren(root).join(' ')).toContain('August');
    expect(textChildren(root).join(' ')).toContain('September');
  });

  it('crosses a year boundary', () => {
    const root = renderTree(<CalendarWeekStrip endDate={new Date(2027, 0, 2)} />).root;

    expect(dayButtons(root)).toHaveLength(7);
    expect(textChildren(root)).toContain(27);
    expect(textChildren(root)).toContain(2);
  });

  it('reports the day pressed and respects disabled days', async () => {
    const onSelectDay = vi.fn();
    const root = renderTree(
      <CalendarWeekStrip
        endDate={new Date(2026, 7, 12)}
        onSelectDay={onSelectDay}
        isDayEnabled={(date) => date.getDate() === 10}
      />,
    ).root;

    await firePress(dayButtons(root)[0]);
    expect(onSelectDay).not.toHaveBeenCalled();

    await firePress(dayButtons(root)[4]);
    const [selected] = onSelectDay.mock.calls[0] as [Date];
    expect(selected.getDate()).toBe(10);
  });
});
