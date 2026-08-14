'use client';

import { formatAdminDate, formatAdminTime, useTranslation } from '@lib/i18n';
import { HistoryIcon, InfoIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { EmptyState, JsonBlock } from '@/components/ui';
import { AuditAction } from '@/proxy/models';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditLogDiffProps {
  action: AuditAction;
  oldValues?: string | null;
  newValues?: string | null;
}

interface DiffRow {
  key: string;
  before: unknown;
  after: unknown;
  kind: 'added' | 'removed' | 'changed';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NOISE_FIELDS = new Set(['UpdatedAt', 'UpdatedBy', 'CreatedAt', 'CreatedBy', 'RowVersion']);

const ROW_BG: Record<DiffRow['kind'], string> = {
  added: 'bg-success/5',
  removed: 'bg-error/5',
  changed: 'bg-warning/5',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tryParse(json: string | null | undefined): Record<string, unknown> | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function humanizeKey(key: string): string {
  // Split on PascalCase / camelCase boundaries, then lowercase all but first word
  const words = key
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .split(' ');

  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      // Keep "ID" capitalised wherever it appears
      if (lower === 'id') return 'ID';
      return i === 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : lower;
    })
    .join(' ');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return `${formatAdminDate(value)} ${formatAdminTime(value)}`;
    }
    return value || '-';
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function buildDiffRows(
  old: Record<string, unknown> | null,
  next: Record<string, unknown> | null,
): DiffRow[] {
  const allKeys = new Set([...Object.keys(old ?? {}), ...Object.keys(next ?? {})]);
  const rows: DiffRow[] = [];

  for (const key of allKeys) {
    if (NOISE_FIELDS.has(key)) continue;

    const before = old?.[key];
    const after = next?.[key];
    const same = JSON.stringify(before) === JSON.stringify(after);

    if (same) continue;

    if (before === undefined) {
      rows.push({ key, before: null, after, kind: 'added' });
    } else if (after === undefined) {
      rows.push({ key, before, after: null, kind: 'removed' });
    } else {
      rows.push({ key, before, after, kind: 'changed' });
    }
  }

  return rows;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldValue({ value, highlight }: { value: unknown; highlight?: 'before' | 'after' }) {
  const formatted = formatValue(value);
  const isEmpty = formatted === '-';

  const colorClass =
    highlight === 'before' ? 'text-error' : highlight === 'after' ? 'text-success' : 'text-text';

  const truncated = formatted.length > 200 ? `${formatted.slice(0, 200)}…` : formatted;

  return (
    <span
      className={`font-mono text-xs ${colorClass} ${isEmpty ? 'opacity-40' : ''}`}
      title={formatted.length > 200 ? formatted : undefined}
    >
      {truncated}
    </span>
  );
}

interface DiffTableProps {
  rows: DiffRow[];
  showBefore: boolean;
  showAfter: boolean;
  valueHeading?: string;
}

function DiffTable({ rows, showBefore, showAfter, valueHeading }: DiffTableProps) {
  const { t } = useTranslation('audit-log');

  const thClass =
    'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary';

  return (
    <div className="overflow-hidden rounded border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-elevated">
          <tr>
            <th className={thClass}>{t('diff.field')}</th>
            {showBefore && <th className={thClass}>{valueHeading ?? t('diff.before')}</th>}
            {showAfter && <th className={thClass}>{valueHeading ?? t('diff.after')}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {rows.map((row) => (
            <tr key={row.key} className={`${ROW_BG[row.kind]} hover:brightness-95`}>
              <td className="px-3 py-2">
                <span className="font-medium text-text">{humanizeKey(row.key)}</span>
              </td>
              {showBefore && (
                <td className="px-3 py-2">
                  <FieldValue
                    value={row.before}
                    highlight={
                      row.kind === 'changed' || row.kind === 'removed' ? 'before' : undefined
                    }
                  />
                </td>
              )}
              {showAfter && (
                <td className="px-3 py-2">
                  <FieldValue
                    value={row.after}
                    highlight={row.kind === 'changed' || row.kind === 'added' ? 'after' : undefined}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditLogDiff({ action, oldValues, newValues }: AuditLogDiffProps) {
  const { t } = useTranslation('audit-log');
  const old = tryParse(oldValues);
  const next = tryParse(newValues);

  if (action === AuditAction.Insert && next) {
    const rows: DiffRow[] = Object.entries(next)
      .filter(([k]) => !NOISE_FIELDS.has(k))
      .map(([key, after]) => ({ key, before: null, after, kind: 'added' }));

    return (
      <DiffTable rows={rows} showBefore={false} showAfter={true} valueHeading={t('diff.value')} />
    );
  }

  if (action === AuditAction.Delete && old) {
    const rows: DiffRow[] = Object.entries(old)
      .filter(([k]) => !NOISE_FIELDS.has(k))
      .map(([key, before]) => ({ key, before, after: null, kind: 'removed' }));

    return (
      <DiffTable rows={rows} showBefore={true} showAfter={false} valueHeading={t('diff.value')} />
    );
  }

  if (old && next) {
    const rows = buildDiffRows(old, next);

    if (rows.length === 0) {
      return (
        <EmptyState
          surface="bare"
          icon={<HistoryIcon size={iconSize.md} className="text-text-muted" />}
          title={t('diff.noChanges')}
        />
      );
    }

    return <DiffTable rows={rows} showBefore={true} showAfter={true} />;
  }

  // Fallback: render raw JSON when parsing fails
  return (
    <div className="space-y-4">
      {oldValues && <JsonBlock label={t('diff.before')} json={oldValues} />}
      {newValues && <JsonBlock label={t('diff.after')} json={newValues} />}
      {!oldValues && !newValues && (
        <EmptyState
          surface="bare"
          icon={<InfoIcon size={iconSize.md} className="text-text-muted" />}
          title={t('diff.noData')}
        />
      )}
    </div>
  );
}
