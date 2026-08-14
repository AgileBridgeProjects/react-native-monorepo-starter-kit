'use client';

import type { IconProps } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentType, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ─── Variants ────────────────────────────────────────────────────────────────

const badgeVariants = cva(
  'inline-flex items-center whitespace-nowrap rounded-full text-xs font-medium',
  {
    variants: {
      variant: {
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        error: 'bg-error/10 text-error',
        info: 'bg-info/10 text-info',
        primary: 'bg-primary/10 text-primary',
        neutral: 'bg-border text-text-secondary',
      },
      iconOnly: {
        true: 'p-1',
        false: 'px-2.5 py-0.5',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      iconOnly: false,
    },
  },
);

// ─── Props ───────────────────────────────────────────────────────────────────

type StatusBadgeProps = VariantProps<typeof badgeVariants> & {
  className?: string;
  'data-testid'?: string;
  title?: string;
  tooltip?: React.ReactNode;
  tooltipPlacement?: 'top' | 'bottom';
} & (
    | { label: string; icon?: ComponentType<IconProps> }
    | { label?: string; icon: ComponentType<IconProps> }
  );

// ─── Component ───────────────────────────────────────────────────────────────

export function StatusBadge({
  label,
  icon: Icon,
  variant,
  tooltip,
  tooltipPlacement = 'bottom',
  className,
  title,
  'data-testid': testId,
}: StatusBadgeProps) {
  const isIconOnly = !!Icon && !label;

  // Portal-based tooltip — avoids clipping by overflow:hidden containers (e.g. DX grid).
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  function showTooltip() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const top = tooltipPlacement === 'top' ? rect.top - 6 : rect.bottom + 6;
    setTooltipPos({ top, left: rect.left + rect.width / 2 });
  }

  function hideTooltip() {
    setTooltipPos(null);
  }

  const badge = (
    <span
      className={cn(badgeVariants({ variant, iconOnly: isIconOnly }), className)}
      data-testid={testId}
      title={title}
      {...(isIconOnly && {
        'aria-label': title ?? (typeof tooltip === 'string' ? tooltip : undefined),
        role: 'img' as const,
      })}
    >
      {Icon && <Icon size={iconSize.xs} />}
      {label && <span className={Icon ? 'ml-1' : undefined}>{label}</span>}
    </span>
  );

  if (tooltip) {
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          className="inline-flex cursor-default bg-transparent p-0 border-0 focus:outline-none"
          aria-describedby={tooltipId}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          onFocus={showTooltip}
          onBlur={hideTooltip}
        >
          {badge}
        </button>
        {tooltipPos !== null &&
          createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              style={{
                position: 'fixed',
                top: tooltipPos.top,
                left: tooltipPos.left,
                transform:
                  tooltipPlacement === 'top'
                    ? 'translateX(-50%) translateY(-100%)'
                    : 'translateX(-50%)',
                zIndex: 9999,
              }}
              className="pointer-events-none rounded-md bg-surface-elevated px-2.5 py-1.5 text-xs shadow-lg ring-1 ring-border"
            >
              {tooltipPlacement === 'top' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-elevated" />
              )}
              {tooltipPlacement === 'bottom' && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-surface-elevated" />
              )}
              <div className="flex flex-col gap-0.5 whitespace-nowrap">{tooltip}</div>
            </div>,
            document.body,
          )}
      </>
    );
  }

  return badge;
}

export type { StatusBadgeProps };
export { badgeVariants };
