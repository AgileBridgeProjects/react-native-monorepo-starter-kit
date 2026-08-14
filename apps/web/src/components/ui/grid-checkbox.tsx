'use client';

import { CheckmarkIcon, IndeterminateCheckboxIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { type InputHTMLAttributes, useEffect, useRef } from 'react';

export interface GridCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean;
}

export function GridCheckbox({ indeterminate, className, ...props }: GridCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);

  return (
    <span className="grid-checkbox-wrapper relative inline-flex items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        className={`grid-checkbox-input h-3.5 w-3.5 cursor-pointer appearance-none rounded-sm border border-border-strong bg-transparent${className ? ` ${className}` : ''}`}
        {...props}
      />
      <CheckmarkIcon
        className="grid-checkbox-check pointer-events-none absolute hidden text-primary-foreground"
        size={iconSize.xs}
      />
      <IndeterminateCheckboxIcon
        className="grid-checkbox-dash pointer-events-none absolute hidden text-primary-foreground"
        size={iconSize.xs}
      />
    </span>
  );
}
