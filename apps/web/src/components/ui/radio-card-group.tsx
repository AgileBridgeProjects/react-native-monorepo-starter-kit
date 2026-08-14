'use client';

import type { IconProps } from '@starterkit/icons';
import { SuccessIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import type { ComponentType } from 'react';
import { useId } from 'react';
import { Typography } from './typography';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RadioCardOption<T extends string> {
  value: T;
  label: string;
  description: string;
  icon: ComponentType<IconProps>;
}

export interface RadioCardGroupProps<T extends string> {
  /** Applied to the wrapping `<fieldset>` — lets a `FormField`'s `htmlFor` target this control. */
  id?: string;
  options: readonly RadioCardOption<T>[];
  /** `undefined` renders with nothing selected — the choice must be made explicitly. */
  value: T | undefined;
  onValueChanged: (value: T) => void;
  legend: string;
  /** Locks the choice — used for a decision that can't change once made elsewhere (e.g. a
   *  template's type once it has been created). */
  disabled?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A vertical stack of selectable cards, each with an icon and a short description — for a
 * choice worth explaining up front rather than a compact control, typically because it can't
 * be changed once made (e.g. reflection templates' type). Built on native radio inputs
 * (visually hidden, card acts as the label) so arrow-key navigation and screen-reader group
 * semantics come for free.
 */
export function RadioCardGroup<T extends string>({
  id,
  options,
  value,
  onValueChanged,
  legend,
  disabled = false,
}: RadioCardGroupProps<T>) {
  const groupName = useId();

  return (
    <fieldset id={id} className="border-0 p-0" disabled={disabled}>
      <legend className="sr-only">{legend}</legend>
      <div className={cn('flex flex-col gap-sm', disabled && 'opacity-60')}>
        {options.map(({ value: optionValue, label, description, icon: Icon }) => {
          const isSelected = value === optionValue;
          const inputId = `${groupName}-${optionValue}`;

          return (
            <label
              key={optionValue}
              htmlFor={inputId}
              className={cn(
                'flex items-start gap-md rounded-lg border p-md transition-colors',
                'focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary',
                disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                isSelected && 'border-primary bg-primary/5',
                !isSelected && 'border-border bg-surface',
                !isSelected && !disabled && 'hover:border-border-strong',
              )}
            >
              <input
                id={inputId}
                type="radio"
                name={groupName}
                className="sr-only"
                checked={isSelected}
                disabled={disabled}
                onChange={() => onValueChanged(optionValue)}
              />

              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-border text-text-secondary',
                )}
              >
                <Icon size={iconSize.sm} aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <Typography
                  variant="label"
                  className={cn('font-semibold', isSelected && 'text-primary')}
                >
                  {label}
                </Typography>
                <Typography variant="caption" className="block text-text-secondary">
                  {description}
                </Typography>
              </div>

              {/* Always rendered (visibility toggled, not the element itself) so the text
                  column's available width — and therefore its wrapping — never changes
                  between selected and unselected states. */}
              <SuccessIcon
                size={iconSize.sm}
                className={cn('shrink-0 text-primary', !isSelected && 'invisible')}
                aria-hidden="true"
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
