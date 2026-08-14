import { cn } from '@starterkit/shared';
import { FormField } from './form-field';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ReadOnlyFieldProps {
  /** Field label shown above the value. */
  label: string;
  /** The display value. */
  value: string;
  /** HTML id for the label→value association. */
  htmlFor: string;
  /** Additional class names for the value text. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A display-only form field that renders a label and a read-only value.
 *
 * Use instead of a `readOnly` `<TextBox>` with `pointer-events-none` hacks.
 * The value is rendered inside a styled container that mirrors the filled
 * input appearance so it sits visually alongside editable fields.
 */
export function ReadOnlyField({ label, value, htmlFor, className }: ReadOnlyFieldProps) {
  return (
    <FormField label={label} htmlFor={htmlFor}>
      <output id={htmlFor} className="block rounded-md bg-surface px-sm py-2.5">
        <Typography variant="body-sm" as="span" className={cn('text-text-secondary', className)}>
          {value}
        </Typography>
      </output>
    </FormField>
  );
}
