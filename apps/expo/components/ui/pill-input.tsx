import type { ReactNode } from 'react';
import { authControlHeight } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import { Input, type InputProps } from './input';
import { Typography } from './typography';

/**
 * Shared dark-surface field treatment: the pill geometry, bold label, and
 * spacing stay identical wherever a form composes these instead of styling
 * `Input` directly — change it here and every consumer follows.
 *
 * The geometry is the design system's existing tall pill control
 * (`authControlHeight` + the `auth` size on `Input`/`Button`) rather
 * than a second set of near-identical numbers.
 */
export const PILL_FIELD_HEIGHT = authControlHeight.input;

/**
 * Bold field label — shared so inputs and custom controls (e.g. a select) match.
 */
export function PillFieldLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  // `font-body-bold` (Poppins 700), not `font-bold`: the brand fonts are loaded
  // as separate named families, so a fontWeight alone doesn't switch the face.
  return (
    <Typography variant="caption" className={cn('font-body-bold text-sm text-white', className)}>
      {children}
    </Typography>
  );
}

/**
 * Dark-surface text field. Single-line fields take the tall pill shape with
 * vertically centred text; multiline fields keep a rounded box that grows
 * with `numberOfLines`.
 */
export function PillInput({ className, containerClassName, labelClassName, ...props }: InputProps) {
  const isMultiline = !!props.multiline;

  return (
    <Input
      {...props}
      variant="outlinedDark"
      textAlignVertical={isMultiline ? 'top' : 'center'}
      labelClassName={cn('font-body-bold mb-xs', labelClassName)}
      // Spacing between fields is owned by the caller's container, not the field.
      containerClassName={cn('mb-0', containerClassName)}
      // `pill` renders at PILL_FIELD_HEIGHT with the text centred in the
      // box — the same geometry PillSelect uses, so the two line up exactly.
      size={isMultiline ? 'multiline' : 'pill'}
      className={className}
    />
  );
}
