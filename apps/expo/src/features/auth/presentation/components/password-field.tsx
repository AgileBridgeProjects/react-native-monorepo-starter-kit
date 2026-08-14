import type { ComponentProps } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Input } from '@/components/ui';

interface PasswordFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder: string;
  /** Optional test identifier forwarded to the underlying input. */
  testID?: string;
  /**
   * Surface treatment, forwarded to `Input`. Defaults to the app's standard field.
   * Pass `outlinedDark` on a screen background, `outlinedDark` on a raised dark card —
   * a pass-through so callers don't each rebuild a password field to restyle one.
   */
  variant?: ComponentProps<typeof Input>['variant'];
  /** Size treatment, forwarded to `Input`. */
  size?: ComponentProps<typeof Input>['size'];
}

export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  testID,
  variant,
  size,
}: PasswordFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          label={label}
          placeholder={placeholder}
          variant={variant}
          size={size}
          secureTextEntry
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          testID={testID}
        />
      )}
    />
  );
}
