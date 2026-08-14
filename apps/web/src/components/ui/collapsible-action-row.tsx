'use client';

import { CheckmarkIcon, ExpandLessIcon, ExpandMoreIcon } from '@starterkit/icons';
import { cn } from '@starterkit/shared';
import type { ReactNode } from 'react';
import { useId } from 'react';
import { ActionMenu, type ActionMenuItem } from './action-menu';
import { Button } from './button';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CollapsibleActionRowProps {
  /** Leading element before the header content — typically a `<DragHandle />` when the row
   *  lives inside a `ReorderableList`. */
  leading?: ReactNode;
  isExpanded: boolean;
  /** Highlights the collapsed row red — never shown purely because content is empty, only
   *  once the caller decides the row has been touched and is currently incomplete. */
  showInvalid?: boolean;
  onToggleExpand: () => void;
  /** When false, the row renders read-only (no expand toggle) — for content this build
   *  doesn't know how to edit. Defaults to true. */
  canExpand?: boolean;
  /** Header content — the caller decides what to render for the expanded vs collapsed
   *  state (see docs/standards/frontend.md § Conditional rendering: this is genuinely two
   *  different bodies, not a fake-fallback ternary, so the decision belongs to the caller). */
  headerContent: ReactNode;
  actions: ActionMenuItem[];
  actionsAriaLabel: string;
  /** Rendered below the header, only when expanded and `canExpand`. */
  expandedPanel?: ReactNode;
  doneLabel: string;
  /** Defaults to `onToggleExpand` — override only if "Done" should do something extra. */
  onDone?: () => void;
  /** Passed through to the `ActionMenu`'s own `menuClassName` — use when this row sits inside
   *  an overlay whose z-index is above the design system's default z-dropdown (see
   *  `ReflectionQuestionRow` for why a drawer needs this). */
  actionsMenuClassName?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A collapsed summary row that expands in place into an editor panel, with a leading slot
 * (drag handle), a trailing action menu, and a "Done" button that collapses it back —
 * extracted from `ReflectionQuestionRow` so a second list-of-editable-items feature (survey
 * questions today, whatever needs this shape next) doesn't re-implement the same shell.
 * Domain-specific summary/preview text and the actual editor form are the caller's job; this
 * component owns only the expand/collapse chrome.
 */
export function CollapsibleActionRow({
  leading,
  isExpanded,
  showInvalid = false,
  onToggleExpand,
  canExpand = true,
  headerContent,
  actions,
  actionsAriaLabel,
  expandedPanel,
  doneLabel,
  onDone,
  actionsMenuClassName,
}: CollapsibleActionRowProps) {
  const panelId = useId();
  const expandIcon = isExpanded ? (
    <ExpandLessIcon aria-hidden="true" className="shrink-0 text-text-secondary" />
  ) : (
    <ExpandMoreIcon aria-hidden="true" className="shrink-0 text-text-secondary" />
  );

  return (
    <div
      className={cn(
        'rounded-md border bg-surface',
        !isExpanded && showInvalid && 'border-error bg-destructive-surface',
        (isExpanded || !showInvalid) && 'border-border',
      )}
    >
      <div className="flex items-center gap-2 px-md py-sm">
        {leading}
        {/* Raw `<button>` is intentional here (same reasoning as SegmentedButton): the
            design system's `Button` is a centred, coloured CVA component built for
            standalone actions, not a left-aligned, full-width disclosure trigger that
            spans this row — every variant would need overriding to undo, not extend. */}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
          onClick={canExpand ? onToggleExpand : undefined}
          disabled={!canExpand}
          aria-expanded={canExpand ? isExpanded : undefined}
          aria-controls={canExpand ? panelId : undefined}
        >
          <div className="min-w-0 flex-1">{headerContent}</div>
          {canExpand && expandIcon}
        </button>

        <ActionMenu
          aria-label={actionsAriaLabel}
          menuClassName={actionsMenuClassName}
          items={actions}
        />
      </div>

      {isExpanded && canExpand && (
        <div id={panelId} className="border-t border-border px-md py-md">
          {expandedPanel}
          <div className="flex justify-end pt-md">
            <Button type="button" variant="outlined" onClick={onDone ?? onToggleExpand}>
              <CheckmarkIcon aria-hidden="true" />
              {doneLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
