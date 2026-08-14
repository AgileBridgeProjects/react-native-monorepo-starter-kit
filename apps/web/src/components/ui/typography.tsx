import { cn } from '@starterkit/shared';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

// ─── Variants ────────────────────────────────────────────────────────────────

const typographyVariants = cva('', {
  variants: {
    variant: {
      h1: 'text-4xl font-bold text-text',
      h2: 'text-3xl font-bold text-text',
      h3: 'text-2xl font-semibold text-text',
      h4: 'text-xl font-semibold text-text',
      body: 'text-base font-normal text-text',
      'body-sm': 'text-sm font-normal text-text',
      label: 'text-sm font-medium text-text-secondary',
      caption: 'text-xs font-normal text-text-muted',
      'section-label': 'text-xs font-semibold uppercase tracking-wide text-text-muted',
    },
  },
  defaultVariants: {
    variant: 'body',
  },
});

// ─── Variant → HTML element map ──────────────────────────────────────────────

const variantElement: Record<string, keyof React.JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  'body-sm': 'p',
  label: 'span',
  caption: 'span',
  'section-label': 'span',
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  children: React.ReactNode;
  /** Override the rendered HTML element. Defaults to the semantic match for the variant. */
  as?: keyof React.JSX.IntrinsicElements;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Typography({
  variant = 'body',
  className,
  children,
  as,
  ...rest
}: TypographyProps) {
  const resolvedVariant = variant ?? 'body';
  const Tag = (as ?? variantElement[resolvedVariant] ?? 'p') as keyof React.JSX.IntrinsicElements;

  return (
    // @ts-expect-error — dynamic tag typing
    <Tag className={cn(typographyVariants({ variant: resolvedVariant }), className)} {...rest}>
      {children}
    </Tag>
  );
}

export type { TypographyProps };
export { typographyVariants };

// ─── Cell Placeholder ────────────────────────────────────────────────────────

export function CellPlaceholder() {
  return (
    <Typography variant="body-sm" as="span" className="text-text-muted">
      —
    </Typography>
  );
}
