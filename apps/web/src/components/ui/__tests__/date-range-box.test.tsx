/// <reference types="@testing-library/jest-dom" />
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DateRangeBox } from '../date-range-box';

const dateRangeBoxMock = vi.hoisted(() => ({
  instances: [] as Array<{
    element: HTMLElement;
    options: {
      value?: Array<Date | string | null>;
      min?: string;
      displayFormat?: string;
      startDateInputAttr?: { id: string };
      startDateLabel?: string;
      endDateLabel?: string;
      isValid?: boolean;
      useMaskBehavior?: boolean;
      onValueChanged?: (event: { value?: Array<Date | string | null> }) => void;
    };
    dispose: ReturnType<typeof vi.fn>;
    option: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('devextreme/ui/date_range_box', () => ({
  default: class MockDateRangeBox {
    element: HTMLElement;
    options: (typeof dateRangeBoxMock.instances)[number]['options'];
    dispose = vi.fn();
    option = vi.fn();

    constructor(
      element: HTMLElement,
      options: (typeof dateRangeBoxMock.instances)[number]['options'],
    ) {
      this.element = element;
      this.options = options;
      dateRangeBoxMock.instances.push(this);
    }
  },
}));

describe('DateRangeBox', () => {
  beforeEach(() => {
    dateRangeBoxMock.instances.length = 0;
    vi.clearAllMocks();
  });

  it('initialises the DevExtreme widget with the provided options', () => {
    render(
      <DateRangeBox
        id="date-range"
        startDate="2026-05-01T00:00:00.000Z"
        endDate={null}
        minDate="2026-05-01"
        startDateLabel="From"
        endDateLabel="Until"
        isValid={false}
        onChange={vi.fn()}
      />,
    );

    expect(dateRangeBoxMock.instances).toHaveLength(1);
    expect(dateRangeBoxMock.instances[0].options).toMatchObject({
      value: ['2026-05-01T00:00:00.000Z', null],
      min: '2026-05-01',
      displayFormat: 'dd/MM/yyyy',
      showClearButton: true,
      stylingMode: 'outlined',
      useMaskBehavior: true,
      startDateInputAttr: { id: 'date-range' },
      startDateLabel: 'From',
      endDateLabel: 'Until',
      isValid: false,
    });
  });

  it('normalises date-only strings to ISO strings and nulls', () => {
    const onChange = vi.fn();
    render(
      <DateRangeBox
        id="date-range"
        startDateLabel="From"
        endDateLabel="Until"
        onChange={onChange}
      />,
    );

    dateRangeBoxMock.instances[0].options.onValueChanged?.({
      value: ['2026-05-26', null],
    });

    expect(onChange).toHaveBeenCalledWith({
      startDate: '2026-05-26T00:00:00.000Z',
      endDate: null,
    });
  });

  it('normalises local Date objects without shifting the selected day', () => {
    const onChange = vi.fn();
    render(
      <DateRangeBox
        id="date-range"
        startDateLabel="From"
        endDateLabel="Until"
        onChange={onChange}
      />,
    );

    dateRangeBoxMock.instances[0].options.onValueChanged?.({
      value: [new Date(2026, 4, 26), new Date(2026, 4, 30)],
    });

    expect(onChange).toHaveBeenCalledWith({
      startDate: '2026-05-26T00:00:00.000Z',
      endDate: '2026-05-30T00:00:00.000Z',
    });
  });

  it('syncs controlled date values without recreating the widget', () => {
    const { rerender } = render(
      <DateRangeBox
        id="date-range"
        startDate="2026-05-01T00:00:00.000Z"
        endDate={null}
        startDateLabel="From"
        endDateLabel="Until"
        onChange={vi.fn()}
      />,
    );

    rerender(
      <DateRangeBox
        id="date-range"
        startDate="2026-05-26T00:00:00.000Z"
        endDate="2026-05-30T00:00:00.000Z"
        startDateLabel="From"
        endDateLabel="Until"
        onChange={vi.fn()}
      />,
    );

    expect(dateRangeBoxMock.instances).toHaveLength(1);
    expect(dateRangeBoxMock.instances[0].option).toHaveBeenCalledWith('value', [
      '2026-05-26T00:00:00.000Z',
      '2026-05-30T00:00:00.000Z',
    ]);
  });

  it('updates validity without recreating the widget', () => {
    const { rerender } = render(
      <DateRangeBox
        id="date-range"
        startDateLabel="From"
        endDateLabel="Until"
        isValid
        onChange={vi.fn()}
      />,
    );

    rerender(
      <DateRangeBox
        id="date-range"
        startDateLabel="From"
        endDateLabel="Until"
        isValid={false}
        onChange={vi.fn()}
      />,
    );

    expect(dateRangeBoxMock.instances).toHaveLength(1);
    expect(dateRangeBoxMock.instances[0].option).toHaveBeenCalledWith('isValid', false);
  });

  it('disposes the widget on unmount', () => {
    const { unmount } = render(
      <DateRangeBox
        id="date-range"
        startDateLabel="From"
        endDateLabel="Until"
        onChange={vi.fn()}
      />,
    );

    unmount();

    expect(dateRangeBoxMock.instances[0].dispose).toHaveBeenCalledOnce();
  });
});
