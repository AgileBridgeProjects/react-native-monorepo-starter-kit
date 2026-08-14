'use client';

import { useTranslation } from '@lib/i18n';
import { ChevronRightIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { NewButton } from './new-button';

export interface NewDropdownButtonItem {
  id: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

export interface NewDropdownButtonProps {
  items: NewDropdownButtonItem[];
  label?: string;
  disabled?: boolean;
  testId?: string;
  /** Optional leading icon override for the trigger (defaults to the "+" add icon). */
  icon?: ReactNode;
  /** Optional extra classes for the dropdown menu (e.g. to widen it for longer labels). */
  menuClassName?: string;
}

export function NewDropdownButton({
  items,
  label,
  disabled = false,
  testId,
  icon,
  menuClassName,
}: NewDropdownButtonProps) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLFieldSetElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <fieldset
      ref={rootRef}
      className="relative"
      onMouseEnter={() => !disabled && setIsOpen(true)}
      onMouseLeave={closeMenu}
      onFocus={() => !disabled && setIsOpen(true)}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
          closeMenu();
        }
      }}
    >
      <NewButton
        type="button"
        label={label ?? t('buttons:new')}
        icon={icon}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        data-testid={testId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <ChevronRightIcon
          aria-hidden="true"
          size={iconSize.xs}
          className="ml-1 rotate-90 transition-transform"
        />
      </NewButton>

      {isOpen && items.length > 0 && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 top-full z-20 w-max max-w-35 rounded-lg border border-border bg-surface p-xs shadow-lg',
            menuClassName,
          )}
        >
          {items.map((item) => (
            <Button
              key={item.id}
              type="button"
              role="menuitem"
              variant="ghost"
              disabled={item.disabled}
              className="w-full justify-start whitespace-nowrap px-sm"
              data-testid={`${testId ?? 'new-dropdown-button'}-${item.id}`}
              onClick={() => {
                if (item.disabled) {
                  return;
                }

                closeMenu();
                item.onClick();
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
    </fieldset>
  );
}
