import { cn } from '@starterkit/shared';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StatChipProps {
  /** DevExtreme icon name (e.g. "hierarchy", "user"). Rendered as `dx-icon-{icon}`. */
  icon: string;
  /** Value shown next to the icon — numeric count or short text label (e.g. a region). */
  value: number | string;
  /** Optional tooltip shown on hover. */
  tooltip?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StatChip({ icon, value, tooltip }: StatChipProps) {
  return (
    <span className="flex items-center gap-xs text-xs text-text-secondary" title={tooltip}>
      <i className={cn('dx-icon', `dx-icon-${icon}`, 'text-sm')} aria-hidden="true" />
      <span>{value}</span>
    </span>
  );
}
