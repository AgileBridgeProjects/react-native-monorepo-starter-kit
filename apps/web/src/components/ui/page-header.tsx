'use client';

import { useTranslation } from '@lib/i18n';
import { ArrowBackIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import Link from 'next/link';
import { Typography } from '@/components/ui/typography';

// ─── Props ───────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  /** Primary action slot — render a button or link here. */
  action?: React.ReactNode;
  /**
   * URL to navigate to when the back control is clicked.
   * - Without `backLabel`: renders a compact icon-only arrow to the left of the title.
   * - With `backLabel`: renders a sleek "← text" link above the title row.
   */
  back?: string;
  /**
   * Text label shown next to the back arrow. When provided, the back link is
   * rendered as a full "← Label" line above the title rather than an icon beside it.
   */
  backLabel?: string;
  /**
   * Optional subtitle line shown below the page title (e.g. a parent entity name).
   */
  subtitle?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PageHeader({ title, action, back, backLabel, subtitle }: PageHeaderProps) {
  const { t } = useTranslation();
  const hasTextBack = !!back && !!backLabel;
  const hasIconBack = !!back && !backLabel;

  return (
    <div className="mb-lg">
      {/* Sleek "← Label" back link — sits above the title row */}
      {hasTextBack && (
        <Link
          href={back}
          className="mb-sm inline-flex w-fit items-center gap-xs text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowBackIcon size={iconSize.xs} aria-hidden="true" />
          {backLabel}
        </Link>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-md">
        <div className="flex items-start gap-sm">
          {/* Icon-only back arrow (legacy / compact variant) */}
          {hasIconBack && (
            <Link
              href={back}
              aria-label={t('common:actions.back')}
              className="mt-0.5 shrink-0 text-text-muted transition-colors hover:text-text"
            >
              <ArrowBackIcon size={iconSize.md} aria-hidden="true" />
            </Link>
          )}
          <div className="flex flex-col gap-0.5">
            <Typography variant="h2">{title}</Typography>
            {subtitle && (
              <Typography variant="body-sm" className="text-text-muted">
                {subtitle}
              </Typography>
            )}
          </div>
        </div>

        {action && <div className="flex shrink-0 items-center gap-sm">{action}</div>}
      </div>
    </div>
  );
}

export type { PageHeaderProps };
