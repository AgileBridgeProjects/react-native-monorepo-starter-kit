import { useTranslation } from '@lib/i18n';
import { FieldError } from './field-error';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  /** Renders a muted "(optional)" marker after the label. Ignored when `required`. */
  optional?: boolean;
  error?: string;
  hint?: string;
  /** Extra content rendered at the far-right of the label row (e.g. a toggle). */
  labelExtra?: React.ReactNode;
  children: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FormField({
  label,
  htmlFor,
  required,
  optional,
  error,
  hint,
  labelExtra,
  children,
}: FormFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium text-text">
          {label}
          {required && (
            <Typography as="span" variant="label" className="ml-xs text-error">
              *
            </Typography>
          )}
          {optional && !required && (
            <Typography as="span" variant="label" className="ml-xs font-normal text-text-muted">
              {t('common:form.optional')}
            </Typography>
          )}
        </label>
        {labelExtra}
      </div>
      {children}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      <FieldError message={error} id={`${htmlFor}-error`} />
    </div>
  );
}
