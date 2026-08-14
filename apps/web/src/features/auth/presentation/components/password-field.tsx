import { HideIcon, ViewIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Button, FormField } from '@/components/ui';

interface PasswordFieldProps {
  id: string;
  label: string;
  placeholder: string;
  error?: string;
  showLabel: string;
  hideLabel: string;
  registration: UseFormRegisterReturn;
  /** Class name applied to the inner input element. */
  inputClassName?: string;
  autoComplete?: string;
  'data-testid'?: string;
}

export function PasswordField({
  id,
  label,
  placeholder,
  error,
  showLabel,
  hideLabel,
  registration,
  inputClassName,
  autoComplete = 'new-password',
  'data-testid': testId,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField label={label} htmlFor={id} required error={error}>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-describedby={error ? `${id}-error` : undefined}
          data-testid={testId}
          className={cn(
            'h-12 w-full rounded-md bg-input pl-md pr-xl text-sm text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary',
            inputClassName,
          )}
          {...registration}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={visible ? hideLabel : showLabel}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-xs top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
        >
          {visible ? <HideIcon size={iconSize.sm} /> : <ViewIcon size={iconSize.sm} />}
        </Button>
      </div>
    </FormField>
  );
}
