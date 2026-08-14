'use client';

import { useTranslation } from '@lib/i18n';
import { cn } from '@starterkit/shared';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SpinnerProps {
  /** Additional classes for sizing or colour overrides. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Spinner({ className }: SpinnerProps) {
  const { t } = useTranslation();

  return (
    <output
      aria-label={t('common:state.loading')}
      className={cn(
        'border-primary block h-8 w-8 animate-spin rounded-full border-4 !border-t-transparent',
        className,
      )}
    />
  );
}
