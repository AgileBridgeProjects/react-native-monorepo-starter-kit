'use client';

import { CancelIcon, SuccessIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import { cva } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Tooltip } from './donut-tooltip';
import { Spinner } from './spinner';

// ─── Variants ───────────────────────────────────────────────────────────────

const inputContainerVariants = cva(
  'flex items-center gap-xs rounded-lg border border-border bg-surface px-sm py-xs transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
  {
    variants: {
      disabled: {
        true: 'cursor-not-allowed opacity-60',
        false: '',
      },
    },
    defaultVariants: {
      disabled: false,
    },
  },
);

const inputVariants = cva(
  'min-w-0 flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed',
);

// ─── Props ─────────────────────────────────────────────────────────────────

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** Content rendered before the input value, such as a search icon. */
  prefix?: ReactNode;
  /** When true, renders a border-right separator between the prefix and the input. Use for text adornments like `@` or `https://`. */
  prefixSeparator?: boolean;
  /** Content rendered after the input value, such as an inline action. */
  suffix?: ReactNode;
  /** Async validation or reachability status rendered after the input value. */
  status?: InputStatusProps;
  /** Class name applied to the input element itself. */
  inputClassName?: string;
}

export interface InputStatusProps {
  isLoading?: boolean;
  /** `undefined` = no status yet, `success` = positive result, `error` = negative result. */
  state?: 'success' | 'error';
  loadingLabel: string;
  successLabel: string;
  successTooltip: string;
  errorLabel: string;
  errorTooltip: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function InputStatusIndicator({
  isLoading,
  state,
  loadingLabel,
  successLabel,
  successTooltip,
  errorLabel,
  errorTooltip,
}: InputStatusProps) {
  if (isLoading) {
    return <Spinner className="h-4 w-4 shrink-0 border-2" aria-label={loadingLabel} />;
  }

  if (state === undefined) return null;

  if (state === 'success') {
    return (
      <span className="group/tooltip relative inline-flex shrink-0 cursor-default">
        <SuccessIcon size={iconSize.sm} className="text-success" aria-label={successLabel} />
        <Tooltip>{successTooltip}</Tooltip>
      </span>
    );
  }

  return (
    <span className="group/tooltip relative inline-flex shrink-0 cursor-default">
      <CancelIcon size={iconSize.sm} className="text-error" aria-label={errorLabel} />
      <Tooltip>{errorTooltip}</Tooltip>
    </span>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, inputClassName, prefix, prefixSeparator, suffix, status, disabled, ...props },
    ref,
  ) => {
    return (
      <div className={cn(inputContainerVariants({ disabled }), className)}>
        {prefix && (
          <span
            className={cn(
              'flex shrink-0 items-center text-sm text-text-muted select-none',
              prefixSeparator && 'border-r border-border pr-xs',
            )}
          >
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(inputVariants(), inputClassName)}
          {...props}
        />
        {status && <InputStatusIndicator {...status} />}
        {suffix && <span className="flex shrink-0 items-center text-text-muted">{suffix}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { inputContainerVariants, inputVariants };
