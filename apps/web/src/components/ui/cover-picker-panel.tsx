'use client';

import { COVER_PATTERN_STYLES, resolveCoverGradientCss } from '@lib/cover-patterns';
import { useTranslation } from '@lib/i18n';
import { CheckIcon, CloseIcon, ExpandMoreIcon, PaletteIcon } from '@starterkit/icons';
import type { CoverGradientId, CoverPatternId } from '@starterkit/shared';
import {
  cn,
  coverPatternIds,
  DEFAULT_GRADIENT_IDS,
  getGradientId,
  getPatternId,
  gradientImageUrl,
  iconSize,
  withPattern,
} from '@starterkit/shared';
import { useState } from 'react';
import { Button } from './button';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CoverPickerPanelProps {
  /**
   * Current `imageUrl` form-field value — may be a gradient sentinel (`gradient:1`),
   * a gradient+pattern composite (`gradient:2|pattern:waves`), a server image URL, or empty.
   */
  imageUrl: string | null | undefined;
  /**
   * Brand hex colour for generating brand-derived gradient variants.
   * `null` / `undefined` falls back to the static preset palette.
   */
  brandColor?: string | null;
  /** @deprecated Upload is now handled by the `CoverImageBanner` hover interaction directly. */
  uploadInputId?: string;
  /**
   * Called when the user selects a gradient or pattern.
   * Receives the new `imageUrl` value (sentinel or composite string) to write into form state.
   */
  onImageUrlChange: (imageUrl: string) => void;
  /** Called when the user presses the clear button — parent should set `imageUrl` to `''`. */
  onClear: () => void;
  /** Prefix for `data-testid` attributes. */
  idPrefix?: string;
  /**
   * Total horizontal padding (px) surrounding this component that the bleed should cancel.
   * Defaults to 48 (DrawerPanel `px-lg` 24px + EntityFormShell `p-lg` 24px).
   * Pass 24 when only one `px-lg` layer is present (e.g. directly inside a DrawerPanel body).
   */
  bleedPx?: number;
}

const SWATCH_BUTTON_CLASS =
  'shrink-0 overflow-hidden transition-all ring-offset-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

function CoverPickerNoPatternIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-3 w-3"
    >
      <line
        x1="10"
        y1="2"
        x2="2"
        y2="10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function buildBleedStyle(bleedPx: number) {
  return {
    marginLeft: `-${bleedPx}px`,
    marginRight: `-${bleedPx}px`,
    width: `calc(100% + ${bleedPx * 2}px)`,
    paddingLeft: `${bleedPx}px`,
    paddingRight: `${bleedPx}px`,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Collapsible cover customisation panel that sits directly below a `CoverImageBanner`.
 *
 * Collapsed: shows a compact "Cover options" toggle row.
 * Expanded: reveals gradient swatches and organic pattern swatches.
 *
 * Must be placed at the same padding nesting depth as `CoverImageBanner` so
 * the horizontal negative-margin bleed lines up with the banner's edges.
 *
 * The bleed uses `–mx-[48px]` / `w-[calc(100%+96px)]` which cancels the two
 * stacked `px-lg` layers: `DrawerPanel px-lg` + `EntityFormShell p-lg` (48px each side total).
 */
export function CoverPickerPanel({
  imageUrl,
  brandColor,
  onImageUrlChange,
  onClear,
  idPrefix = 'cover',
  bleedPx = 48,
}: CoverPickerPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const activeGradientId = getGradientId(imageUrl);
  const activePatternId = getPatternId(imageUrl) ?? 'none';

  const gradientSwatches = DEFAULT_GRADIENT_IDS.map((id) => ({
    id,
    css: resolveCoverGradientCss(id, brandColor),
  }));

  const activeGradientCss = activeGradientId
    ? resolveCoverGradientCss(activeGradientId, brandColor)
    : undefined;
  const fallbackPreviewGradient = resolveCoverGradientCss('1', brandColor);
  const bleedStyle = buildBleedStyle(bleedPx);

  function getPatternLabel(patternId: CoverPatternId) {
    return t(`common:coverBanner.pattern.${patternId}`);
  }

  function handleGradientSelect(id: CoverGradientId) {
    onImageUrlChange(gradientImageUrl(id, activePatternId === 'none' ? null : activePatternId));
  }

  function handlePatternSelect(patternId: CoverPatternId) {
    if (activeGradientId) {
      onImageUrlChange(gradientImageUrl(activeGradientId, patternId === 'none' ? null : patternId));
    } else if (imageUrl) {
      onImageUrlChange(withPattern(imageUrl, patternId === 'none' ? null : patternId));
    }
  }

  const hasContent = !!imageUrl;
  const optionsPanelId = `${idPrefix}-cover-picker-options`;

  return (
    <div className="bg-surface-elevated" style={bleedStyle}>
      {/* ── Toggle trigger ───────────────────────────────────────────────── */}
      <Button
        type="button"
        variant="ghost"
        fullWidth
        aria-expanded={isOpen}
        aria-controls={optionsPanelId}
        data-testid={`${idPrefix}-cover-picker-toggle`}
        className="justify-start gap-2 rounded-none px-0 py-1.5 text-text-muted hover:bg-transparent hover:text-text"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <PaletteIcon size={iconSize.xs} aria-hidden="true" className="shrink-0" />

        {/* Active gradient preview dot — gives feedback about current selection when collapsed */}
        {activeGradientCss && (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ background: activeGradientCss }}
          />
        )}

        <Typography as="span" variant="caption">
          {t('common:coverBanner.options')}
        </Typography>

        <div className="flex-1" />

        <ExpandMoreIcon
          size={iconSize.xs}
          aria-hidden="true"
          className={cn('shrink-0 transition-transform duration-150', isOpen && 'rotate-180')}
        />
      </Button>

      {/* ── Collapsible picker content ────────────────────────────────────── */}
      {isOpen && (
        <div id={optionsPanelId} className="flex items-center gap-2 pb-2">
          {/* ── Clear button ─────────────────────────────────────────────── */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('common:coverBanner.clear')}
            disabled={!hasContent}
            data-testid={`${idPrefix}-cover-clear`}
            className="h-7 w-7 shrink-0 rounded-full p-0 text-text-muted hover:bg-black/8 hover:text-text disabled:pointer-events-none"
            onClick={onClear}
          >
            <CloseIcon size={iconSize.xs} aria-hidden="true" />
          </Button>

          {/* ── Gradient swatches ────────────────────────────────────────── */}
          <fieldset className="flex min-w-0 items-center gap-1 border-0 p-0">
            <legend className="sr-only">{t('common:coverBanner.gradientGroup')}</legend>
            {gradientSwatches.map(({ id, css }) => {
              const isSelected = activeGradientId === id;
              return (
                <Button
                  key={id}
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={isSelected}
                  aria-label={t('common:coverBanner.gradientOption', { id })}
                  data-testid={`${idPrefix}-gradient-${id}`}
                  className={cn(
                    SWATCH_BUTTON_CLASS,
                    'h-7 w-7 rounded-full p-0 hover:bg-transparent',
                    isSelected
                      ? 'opacity-100 ring-2 ring-primary ring-offset-2'
                      : 'opacity-75 hover:opacity-100',
                  )}
                  style={{ background: css }}
                  onClick={() => handleGradientSelect(id)}
                >
                  {isSelected && (
                    <span className="flex h-full w-full items-center justify-center bg-on-primary-overlay text-on-primary">
                      <CheckIcon size={iconSize.xs} aria-hidden="true" />
                    </span>
                  )}
                </Button>
              );
            })}
          </fieldset>

          {/* ── Divider ──────────────────────────────────────────────────── */}
          <div className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />

          {/* ── Pattern swatches ─────────────────────────────────────────── */}
          <fieldset className="flex min-w-0 items-center gap-1 border-0 p-0">
            <legend className="sr-only">{t('common:coverBanner.patternGroup')}</legend>
            {(coverPatternIds as readonly CoverPatternId[]).map((patternId) => {
              const isSelected = activePatternId === patternId;
              const style = COVER_PATTERN_STYLES[patternId];
              const previewGradient = activeGradientId
                ? resolveCoverGradientCss(activeGradientId, brandColor)
                : fallbackPreviewGradient;
              const patternLabel = getPatternLabel(patternId);

              return (
                <Button
                  key={patternId}
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={isSelected}
                  aria-label={patternLabel}
                  title={patternLabel}
                  data-testid={`${idPrefix}-pattern-${patternId}`}
                  className={cn(
                    SWATCH_BUTTON_CLASS,
                    'relative h-7 w-7 rounded-md p-0 hover:bg-transparent',
                    isSelected
                      ? 'opacity-100 ring-2 ring-primary ring-offset-2'
                      : 'opacity-70 hover:opacity-100',
                  )}
                  style={{ background: previewGradient }}
                  onClick={() => handlePatternSelect(patternId)}
                >
                  {/* Pattern overlay preview */}
                  {style && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{
                        backgroundImage: style.backgroundImage,
                        backgroundSize: style.backgroundSize,
                        backgroundRepeat: style.backgroundRepeat,
                        backgroundPosition: style.backgroundPosition,
                      }}
                    />
                  )}
                  {/* "None" pattern indicator — diagonal slash */}
                  {patternId === 'none' && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center text-on-primary-muted"
                    >
                      <CoverPickerNoPatternIcon />
                    </span>
                  )}
                  {/* Selected check */}
                  {isSelected && (
                    <span className="absolute inset-0 flex items-center justify-center bg-on-primary-overlay text-on-primary">
                      <CheckIcon size={iconSize.xs} aria-hidden="true" />
                    </span>
                  )}
                </Button>
              );
            })}
          </fieldset>
        </div>
      )}
    </div>
  );
}
