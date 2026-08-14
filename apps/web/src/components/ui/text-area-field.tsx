'use client';

import DxTextArea, { type ITextAreaOptions } from 'devextreme-react/text-area';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { FieldError } from './field-error';
import { Typography } from './typography';

export interface TextAreaFieldProps
  extends Omit<
    ITextAreaOptions,
    'hint' | 'inputAttr' | 'label' | 'onChange' | 'onValueChanged' | 'value'
  > {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  testId?: string;
  inputAttr?: ITextAreaOptions['inputAttr'];
  className?: string;
}

export function TextAreaField({
  id,
  value,
  onChange,
  label,
  description,
  hint,
  error,
  required,
  testId,
  inputAttr,
  className,
  ...textAreaProps
}: TextAreaFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  const describedBy = [descriptionId, hintId, error ? errorId : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('flex flex-col gap-xs', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
          {required && (
            <Typography as="span" variant="label" className="ml-xs text-error">
              *
            </Typography>
          )}
        </label>
      )}
      {description && (
        <Typography id={descriptionId} variant="caption" className="text-text-muted">
          {description}
        </Typography>
      )}
      <DxTextArea
        value={value}
        onValueChanged={(event) => onChange(event.value ?? '')}
        stylingMode="outlined"
        inputAttr={{
          ...inputAttr,
          id,
          'data-testid': testId,
          'aria-describedby': describedBy || undefined,
          'aria-invalid': error ? 'true' : undefined,
          'aria-required': required ? 'true' : undefined,
        }}
        {...textAreaProps}
      />
      {hint && !error && (
        <Typography id={hintId} variant="caption" className="text-text-muted">
          {hint}
        </Typography>
      )}
      <FieldError message={error} id={errorId} />
    </div>
  );
}
