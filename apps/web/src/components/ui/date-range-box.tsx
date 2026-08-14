'use client';

import { ADMIN_DATE_PICKER_FORMAT } from '@starterkit/shared';
import dxDateRangeBox from 'devextreme/ui/date_range_box';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './button';
import { areRangesEqual, type DateRangeValueTuple, normaliseRange } from './date-range-box.utils';

// ─── Props ─────────────────────────────────────────────────────────────────

export interface DateRangeBoxValue {
  startDate: string | null;
  endDate: string | null;
}

/** A quick-select range pill (e.g. "This week"). Dates are ISO strings. */
export interface DateRangePreset {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
}

export interface DateRangeBoxProps {
  id: string;
  startDate?: string | null;
  endDate?: string | null;
  minDate?: string | null;
  /** Latest selectable date — later dates are greyed out (e.g. completed-days-only ranges). */
  maxDate?: string | null;
  startDateLabel: string;
  endDateLabel: string;
  isValid?: boolean;
  disabled?: boolean;
  className?: string;
  /** Explicit pixel height passed to the DevExtreme widget — use to match adjacent inputs. */
  height?: number;
  surface?: 'default' | 'subtle';
  /** Optional quick-select pills rendered beneath the inputs. */
  presets?: DateRangePreset[];
  onChange: (value: DateRangeBoxValue) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function DateRangeBox({
  id,
  startDate,
  endDate,
  minDate,
  maxDate,
  startDateLabel,
  endDateLabel,
  isValid = true,
  disabled = false,
  className,
  height,
  surface = 'default',
  presets,
  onChange,
}: DateRangeBoxProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<dxDateRangeBox | null>(null);
  const onChangeRef = useRef(onChange);
  const isValidRef = useRef(isValid);
  const isSyncingRef = useRef(false);
  const currentRangeRef = useRef<DateRangeValueTuple>([startDate ?? null, endDate ?? null]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!hostRef.current) return;

    const widget = new dxDateRangeBox(hostRef.current, {
      value: currentRangeRef.current,
      min: minDate ?? undefined,
      max: maxDate ?? undefined,
      displayFormat: ADMIN_DATE_PICKER_FORMAT,
      showClearButton: true,
      stylingMode: 'outlined',
      useMaskBehavior: true,
      startDateInputAttr: { id },
      startDateLabel,
      endDateLabel,
      isValid: isValidRef.current,
      disabled,
      ...(height !== undefined && { height }),
      onValueChanged: (event) => {
        if (isSyncingRef.current) return;

        const [start, end] = normaliseRange(event.value);
        currentRangeRef.current = [start, end];
        onChangeRef.current({
          startDate: start,
          endDate: end,
        });
      },
    });

    widgetRef.current = widget;
    return () => {
      widget.dispose();
      widgetRef.current = null;
    };
  }, [id, minDate, maxDate, startDateLabel, endDateLabel, disabled, height]);

  useEffect(() => {
    const nextRange: DateRangeValueTuple = [startDate ?? null, endDate ?? null];
    if (areRangesEqual(currentRangeRef.current, nextRange)) return;

    currentRangeRef.current = nextRange;
    isSyncingRef.current = true;
    widgetRef.current?.option('value', nextRange);
    isSyncingRef.current = false;
  }, [startDate, endDate]);

  useEffect(() => {
    isValidRef.current = isValid;
    widgetRef.current?.option('isValid', isValid);
  }, [isValid]);

  if (!presets || presets.length === 0) {
    return (
      <div className={cn(surface === 'subtle' && 'date-range-box-subtle', className)}>
        <div ref={hostRef} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-xs',
        surface === 'subtle' && 'date-range-box-subtle',
        className,
      )}
    >
      <div ref={hostRef} />
      <div className="flex flex-wrap gap-xs">
        {presets.map((preset) => {
          const active = startDate === preset.startDate && endDate === preset.endDate;
          return (
            <Button
              key={preset.key}
              variant="outlined"
              size="sm"
              disabled={disabled}
              onClick={() => onChange({ startDate: preset.startDate, endDate: preset.endDate })}
              className={cn(
                'rounded-full text-xs',
                surface === 'subtle'
                  ? active
                    ? 'border-primary bg-white text-primary hover:border-primary'
                    : 'border-border bg-white text-text-muted hover:border-border-strong hover:bg-surface-hover'
                  : active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-text-muted hover:bg-surface-hover',
              )}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
