'use client';

import { cn } from '@/lib/cn';
import { allocationSliderConfig } from './allocation-slider.config';
import { Typography } from './typography';

export interface AllocationSliderSegment {
  id: string;
  label: string;
  value: number;
  colorClassName: string;
  testId?: string;
}

export interface AllocationSliderProps {
  segments: readonly [AllocationSliderSegment, AllocationSliderSegment, AllocationSliderSegment];
  total: number;
  firstBoundaryAriaLabel: string;
  secondBoundaryAriaLabel: string;
  firstBoundaryTestId?: string;
  secondBoundaryTestId?: string;
  testId?: string;
  onChange: (values: [number, number, number]) => void;
}

export function AllocationSlider({
  segments,
  total,
  firstBoundaryAriaLabel,
  secondBoundaryAriaLabel,
  firstBoundaryTestId,
  secondBoundaryTestId,
  testId,
  onChange,
}: AllocationSliderProps) {
  const resolvedTotal = Math.max(0, total);
  const firstCount = Math.min(segments[0].value, resolvedTotal);
  const secondCount = Math.min(segments[1].value, Math.max(0, resolvedTotal - firstCount));
  const firstBoundary = firstCount;
  const secondBoundary = firstCount + secondCount;
  const visibleUnits = Math.min(resolvedTotal, allocationSliderConfig.maxVisibleUnits);
  const markerCount = Math.min(resolvedTotal + 1, allocationSliderConfig.maxVisibleMarkers);
  const markers = Array.from({ length: markerCount }, (_, index) => ({
    id: `allocation-slider-marker-${index}`,
  }));
  const units = Array.from({ length: visibleUnits }, (_, index) => {
    const sourceIndex = Math.floor((index / Math.max(visibleUnits, 1)) * resolvedTotal);
    const segment =
      sourceIndex < firstBoundary
        ? segments[0]
        : sourceIndex < secondBoundary
          ? segments[1]
          : segments[2];

    return {
      id: `allocation-slider-unit-${index}-${segment.id}`,
      colorClassName: segment.colorClassName,
    };
  });

  function emitBoundaryChange(nextFirstBoundary: number, nextSecondBoundary: number) {
    const clampedFirstBoundary = Math.max(0, Math.min(nextFirstBoundary, nextSecondBoundary));
    const clampedSecondBoundary = Math.max(
      clampedFirstBoundary,
      Math.min(nextSecondBoundary, resolvedTotal),
    );

    onChange([
      clampedFirstBoundary,
      clampedSecondBoundary - clampedFirstBoundary,
      resolvedTotal - clampedSecondBoundary,
    ]);
  }

  return (
    <div className="flex flex-col gap-xs" data-testid={testId}>
      <div className="flex flex-wrap items-center gap-x-md gap-y-xs">
        {segments.map((segment) => (
          <span
            key={segment.id}
            className="inline-flex items-baseline gap-1.5"
            data-testid={segment.testId}
          >
            <span className={cn('h-2 w-2 rounded-full', segment.colorClassName)} />
            <Typography variant="caption" className="font-medium text-text-secondary">
              {segment.label}
            </Typography>
            <Typography variant="body-sm" className="font-semibold text-text">
              {segment.value}
            </Typography>
          </span>
        ))}
      </div>

      <div className="relative py-md">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-elevated shadow-inner ring-1 ring-border">
          {units.map((unit) => (
            <span key={unit.id} className={cn('min-w-0 flex-1', unit.colorClassName)} />
          ))}
        </div>
        {markerCount > 1 && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
            {markers.map((marker) => (
              <span key={marker.id} className="h-1.5 w-1.5 rounded-full bg-white/40" />
            ))}
          </div>
        )}

        <input
          aria-label={firstBoundaryAriaLabel}
          className={cn(
            'pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 appearance-none bg-transparent accent-success',
            allocationSliderConfig.rangeThumbBase,
            '[&::-moz-range-thumb]:bg-success',
            allocationSliderConfig.rangeTrackBase,
            allocationSliderConfig.webkitThumbBase,
            '[&::-webkit-slider-thumb]:bg-success',
          )}
          data-testid={firstBoundaryTestId}
          type="range"
          min={0}
          max={resolvedTotal}
          step={1}
          value={firstBoundary}
          onChange={(event) => emitBoundaryChange(Number(event.target.value), secondBoundary)}
          disabled={resolvedTotal < 1}
        />
        <input
          aria-label={secondBoundaryAriaLabel}
          className={cn(
            'pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 appearance-none bg-transparent accent-error',
            allocationSliderConfig.rangeThumbBase,
            '[&::-moz-range-thumb]:bg-error',
            allocationSliderConfig.rangeTrackBase,
            allocationSliderConfig.webkitThumbBase,
            '[&::-webkit-slider-thumb]:bg-error',
          )}
          data-testid={secondBoundaryTestId}
          type="range"
          min={0}
          max={resolvedTotal}
          step={1}
          value={secondBoundary}
          onChange={(event) => emitBoundaryChange(firstBoundary, Number(event.target.value))}
          disabled={resolvedTotal < 1}
        />
      </div>
    </div>
  );
}
