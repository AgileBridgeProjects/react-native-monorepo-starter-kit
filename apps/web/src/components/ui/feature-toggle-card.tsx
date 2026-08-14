'use client';

import { cn } from '@starterkit/shared';
import Switch from 'devextreme-react/switch';
import type { ReactNode } from 'react';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface FeatureToggleCardProps {
  /** Label shown prominently as the feature name. */
  label: string;
  /** Short description shown below the label (1 sentence). */
  description?: string;
  /** Whether the feature is currently enabled. */
  checked: boolean;
  /** Called when the toggle changes. */
  onCheckedChange: (checked: boolean) => void;
  /** HTML id wired to the toggle for accessibility. */
  id?: string;
  /** Additional class names applied to the card root. */
  className?: string;
  /**
   * Content revealed when the feature is enabled.
   * Rendered below a separator inside the card.
   */
  children?: ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A bordered feature-gate card — toggle on the right, label + description on the
 * left. When enabled the card shifts to a tinted primary border and reveals
 * dependent fields below a separator.
 *
 * Mirrors the pattern used in Vercel / Linear project settings where a feature
 * toggle and its configuration fields live in a single visual unit.
 */
export function FeatureToggleCard({
  label,
  description,
  checked,
  onCheckedChange,
  id,
  className,
  children,
}: FeatureToggleCardProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {/* ── Toggle row ─────────────────────────────────────────────────────── */}
      {/* Only bottom padding: the section title above already provides the top gap, so this keeps
          the title→toggle spacing consistent with non-card sections like Profile. */}
      <div className="flex items-center justify-between gap-md pb-sm">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={id}
            className={cn(
              'block cursor-pointer text-sm font-semibold leading-snug transition-colors',
              checked ? 'text-primary' : 'text-text-primary',
            )}
          >
            {label}
          </label>
          {description && (
            <Typography className="mt-0.5 text-xs leading-snug text-text-muted">
              {description}
            </Typography>
          )}
        </div>
        <Switch
          id={id}
          value={checked}
          onValueChanged={(e) => {
            // DevExtreme fires onValueChanged on initialisation (e.event is null/undefined for
            // programmatic changes). Skip those so we only respond to genuine user interaction.
            if (!e.event) return;
            onCheckedChange(Boolean(e.value));
          }}
          elementAttr={{ 'aria-label': label }}
        />
      </div>

      {/* ── Revealed fields ────────────────────────────────────────────────── */}
      {checked && children && <div className="flex flex-col gap-md">{children}</div>}
    </div>
  );
}
