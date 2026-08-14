import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { MonthCalendar } from '@/components/ui/month-calendar';
import { byTestId, firePress, renderTree, textChildren } from '@/test/utils/rtr';

/** Pressables the grid rendered for real days — blanks are plain views. */
const dayButtons = (root: ReturnType<typeof renderTree>['root']) =>
  root.findAll((node) => node.props.accessibilityRole === 'button');

describe('MonthCalendar', () => {
  it('renders one pressable per day in the month', () => {
    // February 2026 has 28 days and starts on a Sunday, the awkward case for a Monday-first
    // grid: it needs six leading blanks or the whole month shifts a column.
    const root = renderTree(<MonthCalendar month={new Date(2026, 1, 15)} />).root;

    expect(dayButtons(root)).toHaveLength(28);
    expect(textChildren(root)).toContain(28);
    expect(textChildren(root)).not.toContain(29);
  });

  it('counts a leap February correctly', () => {
    const root = renderTree(<MonthCalendar month={new Date(2024, 1, 1)} />).root;

    expect(dayButtons(root)).toHaveLength(29);
  });

  it('reports the day that was pressed', async () => {
    const onSelectDay = vi.fn();
    const root = renderTree(
      <MonthCalendar month={new Date(2026, 7, 1)} onSelectDay={onSelectDay} />,
    ).root;

    await firePress(dayButtons(root)[2]);

    const [selected] = onSelectDay.mock.calls[0] as [Date];
    expect(selected.getDate()).toBe(3);
    expect(selected.getMonth()).toBe(7);
  });

  it('does not report presses on days the caller disabled', async () => {
    const onSelectDay = vi.fn();
    const root = renderTree(
      <MonthCalendar
        month={new Date(2026, 7, 1)}
        onSelectDay={onSelectDay}
        isDayEnabled={(date) => date.getDate() > 10}
      />,
    ).root;

    await firePress(dayButtons(root)[0]);
    expect(onSelectDay).not.toHaveBeenCalled();

    await firePress(dayButtons(root)[20]);
    expect(onSelectDay).toHaveBeenCalledOnce();
  });

  it('lets the caller draw whatever a day needs', () => {
    const root = renderTree(
      <MonthCalendar
        month={new Date(2026, 7, 1)}
        renderDayBackground={(date: Date) =>
          date.getDate() === 4 ? <View testID="marker-4" /> : null
        }
      />,
    ).root;

    // The grid itself knows nothing about emotions — it only provides the cell.
    expect(byTestId(root, 'marker-4')).toBeTruthy();
    expect(root.findAll((node) => node.props.testID === 'marker-4')).toHaveLength(1);
  });
});
