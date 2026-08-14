'use client';

import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { cn } from '@starterkit/shared';
import { Skeleton } from './skeleton';

export interface AccordionGridSkeletonConfig {
  rowCount?: number;
  showLeadingVisual?: boolean;
  badgeCount?: number;
  showActions?: boolean;
  childRowCount?: number;
}

interface AccordionGridSkeletonProps extends AccordionGridSkeletonConfig {
  selectable: boolean;
  className?: string;
}

export function AccordionGridSkeleton({
  rowCount = uiConfig.accordion.skeletonRowCount,
  showLeadingVisual = false,
  badgeCount = 1,
  showActions = false,
  selectable,
  className,
}: AccordionGridSkeletonProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-surface-elevated',
        className,
      )}
      aria-busy="true"
      data-testid="accordion-grid-skeleton"
    >
      <span className="sr-only" aria-live="polite">
        {t('common:status.loading')}
      </span>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3" aria-hidden="true">
        {selectable && <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-sm" />}
        <div className="w-5 shrink-0" />
        <Skeleton className="h-3 w-24" />
      </div>

      <div aria-hidden="true">
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no stable identity
            key={rowIndex}
            className={cn(
              'flex items-center gap-3 px-4 py-4',
              rowIndex % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated',
            )}
            data-testid="accordion-grid-skeleton-row"
          >
            {selectable && <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-sm" />}
            <Skeleton className="h-4 w-4 shrink-0" />
            {showLeadingVisual && (
              <Skeleton
                className="h-8 w-8 shrink-0 rounded"
                data-testid="accordion-grid-skeleton-leading"
              />
            )}
            <Skeleton className={cn('h-4', rowIndex % 3 === 0 ? 'w-48' : 'w-36')} />
            <div className="flex-1" />
            {Array.from({ length: badgeCount }, (_, badgeIndex) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton badges have no stable identity
                key={badgeIndex}
                className={cn('h-5 rounded-full', badgeIndex % 2 === 0 ? 'w-24' : 'w-16')}
                data-testid="accordion-grid-skeleton-badge"
              />
            ))}
            {showActions && (
              <Skeleton
                className="h-8 w-8 shrink-0 rounded"
                data-testid="accordion-grid-skeleton-action"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
