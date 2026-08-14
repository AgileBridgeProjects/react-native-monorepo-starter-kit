'use client';

import { cn } from '@starterkit/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SegmentedButtonOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedButtonProps<T extends string> {
  id?: string;
  legend: string;
  options: ReadonlyArray<SegmentedButtonOption<T>>;
  /** `undefined` renders with no option selected — use when an explicit choice is required. */
  value: T | undefined;
  onValueChanged: (value: T) => void;
  /** When true each option expands to fill equal width. */
  fullWidth?: boolean;
  /** When true every option is non-interactive (e.g. the value can no longer change). */
  disabled?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Design-system primitive for a segmented control (mutually exclusive button group).
 *
 * Raw `<button>` elements are intentional here — this component lives in `components/ui/`
 * and implements the ARIA button-group pattern with `aria-pressed` state, which the DX
 * `Button` component does not support natively.
 *
 * Usage:
 * ```tsx
 * <SegmentedButton
 *   legend="Identity provider"
 *   options={[{ value: 'google', label: 'Google' }, { value: 'microsoft', label: 'Microsoft' }]}
 *   value={selected}
 *   onValueChanged={setSelected}
 * />
 * ```
 */
export function SegmentedButton<T extends string>({
  id,
  legend,
  options,
  value,
  onValueChanged,
  fullWidth = false,
  disabled = false,
}: SegmentedButtonProps<T>) {
  return (
    <fieldset
      id={id}
      disabled={disabled}
      className={cn(
        'rounded border border-border-strong p-0',
        fullWidth ? 'flex w-full' : 'inline-flex w-fit',
        disabled && 'opacity-60',
      )}
    >
      <legend className="sr-only">{legend}</legend>
      {options.map(({ value: optValue, label, icon }, idx) => {
        const isSelected = value === optValue;
        const isFirst = idx === 0;
        const isLast = idx === options.length - 1;

        return (
          <button
            key={optValue}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onValueChanged(optValue)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-xs whitespace-nowrap px-md py-sm text-sm transition-colors',
              fullWidth && 'flex-1 justify-center',
              'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              'disabled:cursor-not-allowed',
              isFirst && 'rounded-l',
              isLast && 'rounded-r',
              !isLast && 'border-r border-border-strong',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-text hover:bg-transparent',
            )}
          >
            {icon}
            <span>{label}</span>
          </button>
        );
      })}
    </fieldset>
  );
}
