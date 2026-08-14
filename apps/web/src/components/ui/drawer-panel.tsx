'use client';

import { useTranslation } from '@lib/i18n';
import { ProcessLockContext, type ProcessLockContextValue } from '@lib/process-lock-context';
import { uiConfig } from '@lib/ui-config';
import { ChevronLeftIcon, ChevronRightIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import DxButton from 'devextreme-react/button';
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from './button';
import { Typography } from './typography';

// ─── Constants ─────────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

type DrawerSize = keyof typeof uiConfig.drawer.sizes;

export interface DrawerCollapseConfig {
  /** Minimum (contracted) width in pixels. */
  minWidth?: number;
  /** Maximum (expanded) width in pixels. */
  maxWidth?: number;
}

export const drawerSizes = uiConfig.drawer.sizes;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DrawerPanelProps {
  /** Heading shown in the panel title bar. */
  title: React.ReactNode;
  /** Optional secondary line beneath the title — use for context like club name. */
  subtitle?: string;
  /**
   * Optional chip/badge shown in the title bar. When provided the header renders
   * as two rows: [badge | close], then [title · subtitle inline].
   */
  badge?: React.ReactNode;
  visible: boolean;
  onHide: () => void;
  children: React.ReactNode;
  /** Fixed panel width in pixels. Overrides size when supplied (non-collapsible only). */
  width?: number;
  /** Size preset for consistent drawer widths. Defaults to `md`. */
  size?: DrawerSize;
  /**
   * Enable expand/contract toggle. Opens at maxWidth; user can contract to minWidth.
   * Pass a config object to override min/max width constraints.
   */
  collapsible?: boolean | DrawerCollapseConfig;
  /**
   * When collapsible, open in the contracted (minWidth) state instead of expanded.
   * The user can still expand via the handle. Ignored when not collapsible.
   */
  defaultCollapsed?: boolean;
  /** Rendered between the header and the padded body — spans full panel width, no p-lg applied. */
  topContent?: React.ReactNode;
  /** Pinned footer below the scrollable body — use for action bars that must stay visible. */
  bottomContent?: React.ReactNode;
  /**
   * Render children flush — without the built-in ScrollView and body padding. The child owns
   * scrolling and layout (full-height master–detail workspaces).
   */
  flushBody?: boolean;
  'data-testid'?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DrawerPanel({
  title,
  subtitle,
  badge,
  visible,
  onHide,
  children,
  width,
  size = 'md',
  collapsible = false,
  defaultCollapsed = false,
  topContent,
  bottomContent,
  flushBody = false,
  'data-testid': testId,
}: DrawerPanelProps) {
  // ── Process lock ──────────────────────────────────────────────────────────
  // Allows EntityFormShell (or any descendant) to block the drawer from closing
  // while a mutation is in flight. Lock/unlock are exposed via context; the
  // drawer itself reads isLocked to guard all close paths.
  const [isLocked, setIsLocked] = useState(false);
  const processLockContextValue = useMemo<ProcessLockContextValue>(
    () => ({
      lock: () => setIsLocked(true),
      unlock: () => setIsLocked(false),
    }),
    [],
  );

  const handleHide = useCallback(() => {
    if (isLocked) return;
    onHide();
  }, [isLocked, onHide]);

  // Warn the browser's own navigation (back/forward/close) while locked.
  useEffect(() => {
    if (!isLocked) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [isLocked]);

  // Unlock when the drawer closes so stale lock state doesn't carry over to the
  // next open (e.g. mutation completed but unlock effect hasn't fired yet).
  useEffect(() => {
    if (!visible) setIsLocked(false);
  }, [visible]);
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const isCollapsible = !!collapsible;
  let collapseConfig: DrawerCollapseConfig | undefined;
  if (typeof collapsible === 'object') {
    collapseConfig = collapsible;
  }

  const minWidth = collapseConfig?.minWidth ?? uiConfig.drawer.collapsibleDefaults.minWidth;
  const maxWidth = collapseConfig?.maxWidth ?? uiConfig.drawer.collapsibleDefaults.maxWidth;
  let baseWidth = width ?? drawerSizes[size];
  if (isCollapsible) {
    baseWidth = maxWidth;
  }

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  let currentWidth = baseWidth;
  if (isCollapsible) {
    currentWidth = maxWidth;
  }
  if (isCollapsible && isCollapsed) {
    currentWidth = minWidth;
  }

  // Reset to the configured open state each time the drawer opens.
  useEffect(() => {
    if (visible) setIsCollapsed(defaultCollapsed);
  }, [visible, defaultCollapsed]);

  // Capture trigger element and manage focus on open/close.
  useEffect(() => {
    if (visible) {
      triggerRef.current = document.activeElement;
      // Defer so the panel has finished its open animation before we focus.
      const id = window.setTimeout(() => {
        if (!panelRef.current) return;
        const first = panelRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        first?.focus();
      }, 50);
      return () => window.clearTimeout(id);
    } else {
      // Restore focus to the element that opened the panel.
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
      triggerRef.current = null;
    }
  }, [visible]);

  // Close on ESC key
  useEffect(() => {
    if (!visible) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleHide();
        return;
      }
      // Focus trap — keep Tab/Shift+Tab inside the panel
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.closest('[aria-hidden="true"]'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleHide]);

  let collapseIcon = <ChevronRightIcon size={iconSize.md} />;
  if (isCollapsed) {
    collapseIcon = <ChevronLeftIcon size={iconSize.md} />;
  }

  let collapseAriaLabel = t('common:actions.collapsePanel');
  if (isCollapsed) {
    collapseAriaLabel = t('common:actions.expandPanel');
  }

  let backdropTabIndex = -1;
  if (visible) {
    backdropTabIndex = 0;
  }

  let backdropOpacityClass = 'opacity-0';
  if (visible) {
    backdropOpacityClass = 'opacity-100';
  }

  let panelTransformClass = 'translate-x-full';
  if (visible) {
    panelTransformClass = 'translate-x-0';
  }

  let bodyContent: ReactNode = (
    <div className="h-full overflow-x-hidden overflow-y-auto px-lg pb-lg pt-sm">{children}</div>
  );
  if (flushBody) {
    bodyContent = children;
  }

  let headerLayoutClass = 'flex-row items-center justify-between py-sm';
  if (badge) {
    headerLayoutClass = 'flex-col gap-1 py-sm';
  }

  let headerContent = (
    <>
      <div className="flex flex-col gap-0.5">
        <Typography id={titleId} variant="h4">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body-sm" className="text-text-secondary">
            {subtitle}
          </Typography>
        )}
      </div>
      <DxButton
        icon="close"
        type="normal"
        stylingMode="text"
        disabled={isLocked}
        onClick={handleHide}
        elementAttr={{ 'aria-label': t('common:actions.closePanel') }}
      />
    </>
  );
  if (badge) {
    headerContent = (
      <>
        <div className="flex items-center justify-between">
          {badge}
          <DxButton
            icon="close"
            type="normal"
            stylingMode="text"
            disabled={isLocked}
            onClick={handleHide}
            elementAttr={{ 'aria-label': t('common:actions.closePanel') }}
          />
        </div>
        <div className="flex items-baseline gap-2">
          <Typography id={titleId} variant="h4">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body-sm" className="text-text-secondary">
              {subtitle}
            </Typography>
          )}
        </div>
      </>
    );
  }

  return (
    <ProcessLockContext.Provider value={processLockContextValue}>
      <div
        className={cn('fixed inset-0 z-[999]', !visible && 'pointer-events-none')}
        data-testid={testId}
      >
        {/* Backdrop scrim — not clickable while a process is running */}
        <Button
          type="button"
          variant="ghost"
          aria-label={t('common:actions.closePanel')}
          aria-hidden={!visible}
          tabIndex={backdropTabIndex}
          disabled={isLocked}
          className={cn(
            'absolute inset-0 h-auto w-full cursor-default rounded-none bg-black/40 hover:bg-black/40 transition-opacity duration-300 disabled:opacity-100',
            backdropOpacityClass,
          )}
          onClick={handleHide}
        />

        {/* Slide-in panel — CSS translateX for open/close, animated width for expand/collapse */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal={visible}
          aria-labelledby={titleId}
          aria-hidden={!visible}
          // biome-ignore lint/suspicious/noExplicitAny: inert is not in React's HTMLAttributes yet
          {...(!visible && { inert: true as any })}
          className={cn(
            'absolute inset-y-0 right-0 flex flex-col border-l border-border bg-surface-elevated shadow-2xl',
            // Animate both the slide (transform) and the expand/collapse (width) so resizing the
            // panel eases smoothly instead of snapping. Width is right-anchored, so it grows leftward.
            'transition-[transform,width] duration-300 ease-in-out will-change-[transform,width]',
            'w-[var(--drawer-width)] max-w-[100vw]',
            panelTransformClass,
          )}
          style={{ '--drawer-width': `${currentWidth}px` } as CSSProperties}
        >
          {isCollapsible && visible && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={collapseAriaLabel}
              className="group absolute inset-y-0 left-0 z-10 h-full w-3 rounded-none p-0 hover:bg-transparent"
              onClick={() => setIsCollapsed((prev) => !prev)}
            >
              <div className="flex h-full items-center justify-center">
                <span className="rounded-md bg-surface-elevated p-1 text-text-muted transition-colors group-hover:text-primary">
                  {collapseIcon}
                </span>
              </div>
            </Button>
          )}

          <div className={cn('relative z-10 flex shrink-0 px-lg', headerLayoutClass)}>
            {headerContent}
          </div>
          {topContent && <div className="relative z-10 shrink-0">{topContent}</div>}
          <div className="min-h-0 flex-1">{bodyContent}</div>
          {bottomContent && (
            <div className="relative z-10 shrink-0 border-t border-border bg-surface-elevated px-lg py-md">
              {bottomContent}
            </div>
          )}
        </div>
      </div>
    </ProcessLockContext.Provider>
  );
}
