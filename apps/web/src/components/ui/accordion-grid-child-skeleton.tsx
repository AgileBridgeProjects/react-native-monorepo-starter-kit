'use client';

import { useTranslation } from '@lib/i18n';
import { cn } from '@starterkit/shared';
import { useEffect, useState } from 'react';
import { Skeleton } from './skeleton';

const REVEAL_DELAY_MS = 140;

interface AccordionGridChildSkeletonProps {
  rowCount: number;
  selectable: boolean;
  showActions: boolean;
  showTreeConnectors: boolean;
}

export function AccordionGridChildSkeleton({
  rowCount,
  selectable,
  showActions,
  showTreeConnectors,
}: AccordionGridChildSkeletonProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        'transition-opacity duration-150 motion-reduce:transition-none',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
      aria-busy="true"
      data-testid="accordion-grid-child-skeleton"
    >
      <span className="sr-only" aria-live="polite">
        {t('common:status.loading')}
      </span>
      {Array.from({ length: rowCount }, (_, rowIndex) => {
        const isLast = rowIndex === rowCount - 1;
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no stable identity
            key={rowIndex}
            className="flex items-start gap-3 py-2 pl-4 pr-4"
            aria-hidden="true"
          >
            {selectable && <div className="w-3.5 shrink-0" />}
            <div className="relative w-5 shrink-0 self-stretch">
              {showTreeConnectors && (
                <>
                  <div
                    className={cn(
                      'absolute left-1/2 top-0 w-px -translate-x-1/2 bg-border',
                      isLast ? 'h-4' : 'h-full',
                    )}
                  />
                  <div className="absolute left-1/2 top-4 h-px w-4 bg-border" />
                </>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center py-1.5">
              <Skeleton className={cn('h-4', rowIndex % 2 === 0 ? 'w-40' : 'w-28')} />
            </div>
            {showActions && <Skeleton className="h-8 w-8 shrink-0 rounded" />}
          </div>
        );
      })}
    </div>
  );
}
