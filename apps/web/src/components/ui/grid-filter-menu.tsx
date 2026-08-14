'use client';

import { useClickOutside } from '@lib/hooks/use-click-outside';
import { useEscapeKey } from '@lib/hooks/use-escape-key';
import { useTranslation } from '@lib/i18n';
import { CloseIcon, FilterIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GridFilterMenuProps {
  activeCount: number;
  onClearAll: () => void;
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GridFilterMenu({ activeCount, onClearAll, children }: GridFilterMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, left: rect.right });
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  const outsideRefs = useMemo(() => [panelRef, triggerRef], []);
  useClickOutside(outsideRefs, () => setOpen(false), open);

  const handleEscape = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  useEscapeKey(handleEscape, open);

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          id={menuId}
          role="dialog"
          aria-label={t('common:filter.filters')}
          // eslint-disable-next-line react/forbid-component-props
          style={{ top: position.top, left: position.left }}
          className="fixed z-(--z-dropdown) w-72 -translate-x-full overflow-hidden rounded-lg border border-border bg-surface-elevated p-md shadow-lg"
        >
          <div className="flex flex-col gap-md">
            {children}

            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="self-start text-text-muted hover:text-text"
              >
                <CloseIcon size={iconSize.sm} aria-hidden />
                {t('common:filter.clearAll')}
              </Button>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <Button
        ref={triggerRef}
        variant="outlined"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(activeCount > 0 && 'border-primary text-primary')}
      >
        <FilterIcon size={iconSize.sm} aria-hidden />
        {t('common:filter.filters')}
        {activeCount > 0 && (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>

      {panel}
    </>
  );
}
