'use client';

import { useTranslation } from '@lib/i18n';
import { CheckIcon, PaletteIcon } from '@starterkit/icons';
import {
  type CoverGradientId,
  cn,
  coverGradient,
  DEFAULT_GRADIENT_IDS,
  iconSize,
} from '@starterkit/shared';
import { useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface GradientPickerPillProps {
  /** Currently selected gradient id, or undefined if none / custom image. */
  selectedGradientId: CoverGradientId | undefined;
  /** Whether there's any cover content (gradient or uploaded image). */
  hasContent: boolean;
  /** Called when a gradient is selected. */
  onGradientSelect: (id: CoverGradientId) => void;
  /** Called when the "no gradient / clear" button is pressed. */
  onClear: () => void;
  /** Test ID prefix. */
  idPrefix?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Expanding card overlay for picking a gradient cover. Shows as a palette icon
 * that expands into circular swatches on click. Designed to float in a cover banner.
 */
export function GradientPickerPill({
  selectedGradientId,
  onGradientSelect,
  idPrefix = 'cover',
}: GradientPickerPillProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="absolute top-2 right-2 flex flex-col items-end gap-1">
      {open && (
        <Typography variant="caption" className="font-medium">
          {t('common:coverBanner.useGradient')}
        </Typography>
      )}

      <div className="flex items-center gap-1.5 rounded-2xl bg-white p-1.5 shadow-lg">
        {open && (
          <>
            {DEFAULT_GRADIENT_IDS.map((id) => {
              const isSelected = selectedGradientId === id;
              let selectedClass = 'opacity-80 hover:opacity-100';
              if (isSelected) {
                selectedClass = 'ring-2 ring-primary ring-offset-2';
              }
              return (
                <Button
                  key={id}
                  variant="ghost"
                  size="sm"
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${t('common:coverBanner.useGradient')} ${id}`}
                  className={cn(
                    'relative h-8 w-8 shrink-0 overflow-hidden rounded-full p-0 [background:var(--cover-bg)] hover:[background:var(--cover-bg)]',
                    selectedClass,
                  )}
                  style={{ '--cover-bg': coverGradient[id] } as React.CSSProperties}
                  onClick={() => onGradientSelect(id)}
                  data-testid={`${idPrefix}-gradient-${id}`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <CheckIcon className="text-white drop-shadow" size={iconSize.xs} />
                    </div>
                  )}
                </Button>
              );
            })}

            {/* Divider */}
            <div className="mx-0.5 h-6 w-px bg-border" aria-hidden />
          </>
        )}

        {/* Palette toggle */}
        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label={t('common:coverBanner.useGradient')}
          aria-expanded={open}
          className={cn('h-8 w-8 rounded-full p-0', 'text-text-muted hover:bg-black/5')}
          onClick={() => setOpen((prev) => !prev)}
          data-testid={`${idPrefix}-gradient-trigger`}
        >
          <PaletteIcon size={iconSize.sm} />
        </Button>
      </div>
    </div>
  );
}
