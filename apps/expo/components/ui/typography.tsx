import { toTestId } from '@starterkit/shared';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';
import type { TextProps as RNTextProps } from 'react-native';
import { Text as RNText } from 'react-native';
import { cn } from '@/src/lib/cn';

// ─── Variants ────────────────────────────────────────────────────────────────

const typographyVariants = cva('', {
  variants: {
    variant: {
      // Headings use the Bebas Neue display face (font-heading); body/label/caption
      // use Poppins (font-body) — the StarterKit brand fonts, wired via design tokens.
      h1: 'font-heading text-4xl tracking-wide text-text',
      h2: 'font-heading text-2xl tracking-wide text-text',
      h3: 'font-heading text-xl tracking-wide text-text',
      h4: 'font-heading text-lg tracking-wide text-text',
      body: 'font-body text-base text-text',
      'body-sm': 'font-body text-sm text-text',
      label: 'font-body text-sm font-medium text-text-secondary',
      caption: 'font-body text-xs text-text-muted',
    },
  },
  defaultVariants: {
    variant: 'body',
  },
});

// ─── Props ───────────────────────────────────────────────────────────────────

interface TypographyProps
  extends Omit<RNTextProps, 'className'>,
    VariantProps<typeof typographyVariants> {
  children: ReactNode;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Typography({ variant, className, children, ...textProps }: TypographyProps) {
  const derivedTestID = typeof children === 'string' ? toTestId(children) : undefined;
  return (
    <RNText
      className={cn(typographyVariants({ variant }), className)}
      testID={derivedTestID}
      {...textProps}
    >
      {children}
    </RNText>
  );
}

export type { TypographyProps };
export { typographyVariants };
