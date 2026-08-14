'use client';

import { MoreVerticalIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import {
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useClickOutside } from '@/lib/hooks/use-click-outside';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';

import { Button } from './button';
import { Spinner } from './spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionMenuItem {
  /** Visible label for the action. */
  label: string;
  /** Optional leading icon. */
  icon?: ReactNode;
  /** Callback when the action is selected. Return a Promise to keep the menu open until it settles. */
  onClick: () => void | Promise<void>;
  /** Visual variant — destructive actions render in red. */
  variant?: 'default' | 'destructive';
  /** Disables the action. */
  disabled?: boolean;
  /** External loading state — shows a spinner and disables other items. Use when the loading is
   *  driven outside the component (e.g. via useTransition). */
  isLoading?: boolean;
}

export interface ActionMenuProps {
  /** Array of menu actions. */
  items: ActionMenuItem[];
  /** Accessible label for the trigger button. */
  'aria-label'?: string;
  /** Additional class names for the trigger button. */
  className?: string;
  /** Additional class names for the dropdown menu panel (e.g. to override min-width). */
  menuClassName?: string;
  /** Props forwarded to the trigger button. */
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A kebab (⋮) menu that opens a dropdown of action items.
 *
 * Supports async actions: if an `onClick` returns a `Promise`, the menu stays open,
 * shows a spinner on the clicked item, and disables all others until the Promise settles.
 * External loading state can also be signalled via the `isLoading` prop on an item.
 *
 * @example
 * ```tsx
 * <ActionMenu
 *   aria-label="Game actions"
 *   items={[
 *     { label: 'Edit', icon: <EditIcon />, onClick: handleEdit },
 *     { label: 'Delete', icon: <DeleteIcon />, onClick: handleDelete, variant: 'destructive' },
 *     { label: 'Navigate', icon: <LinkIcon />, onClick: navigate, isLoading: isPending },
 *   ]}
 * />
 * ```
 */
export function ActionMenu({
  items,
  'aria-label': ariaLabel,
  className,
  menuClassName,
  buttonProps,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const openedWithKeyboardRef = useRef(false);

  const hasExternalLoading = items.some((item) => item.isLoading);
  const isAnyLoading = loadingIndex !== null || hasExternalLoading;

  // Position the portal dropdown relative to the trigger, flipping above if it would clip
  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const gap = 4;
    const spaceBelow = window.innerHeight - triggerRect.bottom - gap;
    const top =
      spaceBelow >= menuHeight ? triggerRect.bottom + gap : triggerRect.top - gap - menuHeight;
    setPosition({ top: Math.max(0, top), left: triggerRect.right });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition]);

  // Re-measure after the menu renders so the flip calculation uses actual height
  useEffect(() => {
    if (!open || !menuRef.current) return;
    reposition();
  }, [open, reposition]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  // Close on outside click — blocked while an action is loading
  const outsideRefs = useMemo(() => [menuRef, triggerRef], []);
  useClickOutside(
    outsideRefs,
    () => {
      if (!isAnyLoading) setOpen(false);
    },
    open,
  );

  // Close on Escape — blocked while an action is loading
  const handleEscape = useCallback(() => {
    if (isAnyLoading) return;
    setOpen(false);
    triggerRef.current?.focus();
  }, [isAnyLoading]);
  useEscapeKey(handleEscape, open);

  // Keyboard-opened menus focus the first action. Pointer-opened menus focus the
  // menu container so no action appears selected before the user chooses one.
  useEffect(() => {
    if (open) {
      if (!openedWithKeyboardRef.current) {
        setFocusedIndex(-1);
        requestAnimationFrame(() => menuRef.current?.focus());
        return;
      }

      const enabledIndices = items.reduce<number[]>((acc, item, i) => {
        if (!item.disabled) acc.push(i);
        return acc;
      }, []);
      if (enabledIndices.length === 0) return;
      const first = enabledIndices[0];
      setFocusedIndex(first);
      requestAnimationFrame(() => itemRefs.current[first]?.focus());
    }
  }, [open, items]);

  const handleTriggerClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      if (open && isAnyLoading) return;
      openedWithKeyboardRef.current = false;
      setOpen((prev) => !prev);
    },
    [open, isAnyLoading],
  );

  const handleTriggerKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      openedWithKeyboardRef.current = true;
      setOpen(true);
    }
  }, []);

  const handleMenuKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const enabledItems = items.reduce<number[]>((acc, item, i) => {
        if (!item.disabled) acc.push(i);
        return acc;
      }, []);

      if (enabledItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentPos = enabledItems.indexOf(focusedIndex);
        const next = enabledItems[(currentPos + 1) % enabledItems.length];
        setFocusedIndex(next);
        itemRefs.current[next]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentPos = enabledItems.indexOf(focusedIndex);
        const prev = enabledItems[(currentPos - 1 + enabledItems.length) % enabledItems.length];
        setFocusedIndex(prev);
        itemRefs.current[prev]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        const first = enabledItems[0];
        setFocusedIndex(first);
        itemRefs.current[first]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        const last = enabledItems[enabledItems.length - 1];
        setFocusedIndex(last);
        itemRefs.current[last]?.focus();
      }
    },
    [items, focusedIndex],
  );

  const handleItemClick = useCallback(
    (item: ActionMenuItem, index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();

      if (item.disabled || item.isLoading || isAnyLoading) return;

      const result = item.onClick();

      if (result instanceof Promise) {
        setLoadingIndex(index);
        result.then(
          () => {
            setLoadingIndex(null);
            setOpen(false);
            triggerRef.current?.focus();
          },
          () => {
            setLoadingIndex(null);
            setOpen(false);
            triggerRef.current?.focus();
          },
        );
      } else {
        setOpen(false);
        triggerRef.current?.focus();
      }
    },
    [isAnyLoading],
  );

  const dropdown =
    open &&
    createPortal(
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        tabIndex={-1}
        aria-orientation="vertical"
        onKeyDown={handleMenuKeyDown}
        style={{
          top: position.top,
          left: position.left,
        }}
        className={cn(
          'fixed z-(--z-dropdown) min-w-48 -translate-x-full overflow-hidden rounded-lg border border-border bg-surface-elevated py-1 shadow-lg focus:outline-none',
          menuClassName,
        )}
      >
        {items.map((item, index) => {
          const isItemLoading = item.isLoading === true || loadingIndex === index;
          const isItemDisabled = item.disabled || (isAnyLoading && !isItemLoading);

          return (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={focusedIndex === index ? 0 : -1}
              disabled={isItemDisabled}
              aria-busy={isItemLoading || undefined}
              onClick={(e) => handleItemClick(item, index, e)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                'focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
                item.variant === 'destructive'
                  ? 'action-menu-item-destructive'
                  : 'text-text hover:bg-surface focus:bg-surface',
              )}
            >
              {(isItemLoading || item.icon) && (
                <span
                  aria-hidden="true"
                  className="flex size-(--size-icon-xs) shrink-0 items-center justify-center"
                >
                  {isItemLoading ? <Spinner className="size-full border-2" /> : item.icon}
                </span>
              )}
              {item.label}
            </button>
          );
        })}
      </div>,
      document.body,
    );

  if (items.length === 0) return null;

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        aria-label={ariaLabel ?? 'Actions'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className={cn('h-8 w-8 p-0 text-text-secondary hover:text-text', className)}
        {...buttonProps}
      >
        <MoreVerticalIcon aria-hidden="true" size={iconSize.sm} />
      </Button>
      {dropdown}
    </>
  );
}
