import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import type { InputProps } from './input';
import { Input } from './input';

// ─── Props ───────────────────────────────────────────────────────────────────

interface FormFieldProps<T extends FieldValues>
  extends Omit<InputProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> {
  /** react-hook-form control object. */
  control: Control<T>;
  /** Field name — must match a key in the form schema. */
  name: FieldPath<T>;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function FormField<T extends FieldValues>({
  control,
  name,
  ...inputProps
}: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <Input
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
          {...inputProps}
        />
      )}
    />
  );
}

export type { FormFieldProps };
