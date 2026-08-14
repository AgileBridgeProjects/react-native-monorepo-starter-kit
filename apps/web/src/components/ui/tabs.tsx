'use client';

import { cn } from '@starterkit/shared';
import {
  type CSSProperties,
  isValidElement,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Button } from './button';
import { StatusBadge } from './status-badge';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TabOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Optional badge (e.g. a count) rendered next to the label. */
  badge?: ReactNode;
  /** Optional className applied to this specific tab label wrapper. */
  className?: string;
}

export interface TabsProps<T extends string> {
  /** Accessible name for the tab list (read by screen readers). */
  label: string;
  options: ReadonlyArray<TabOption<T>>;
  value: T;
  onValueChanged: (value: T) => void;
  /** Optional className applied to the tab list container. */
  className?: string;
  /** Optional className applied to each individual tab. */
  tabClassName?: string;
  /** Test ID prefix; each tab gets `${testIdPrefix}-${value}`. */
  testIdPrefix?: string;
  /**
   * Visual style. `underline` (default) is the app-wide bottom-border style; `pills` renders a
   * segmented control where the active tab is a filled rounded pill (used by the reports
   * dashboard to match its designs, ABC-123).
   */
  variant?: 'underline' | 'pills';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Tabs<T extends string>({
  label,
  options,
  value,
  onValueChanged,
  className,
  tabClassName,
  testIdPrefix,
  variant = 'underline',
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [animated, setAnimated] = useState(false);
  const isPills = variant === 'pills';

  // Measure the active tab and update the indicator position (underline variant only).
  useLayoutEffect(() => {
    if (isPills) return;
    const list = listRef.current;
    if (!list) return;
    const idx = options.findIndex((o) => o.value === value);
    const tab = list.children[idx] as HTMLElement | undefined;
    if (!tab) return;
    setIndicator({ left: tab.offsetLeft, width: tab.offsetWidth });
  }, [value, options, isPills]);

  // Enable the CSS transition only after the first measurement so the indicator
  // snaps to the correct position on mount instead of animating from (0, 0).
  useEffect(() => {
    setAnimated(true);
  }, []);

  if (isPills) {
    return (
      <div role="tablist" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Button
              key={option.value}
              role="tab"
              variant="ghost"
              aria-selected={isSelected}
              onClick={() => onValueChanged(option.value)}
              data-testid={testIdPrefix ? `${testIdPrefix}-${option.value}` : undefined}
              className={cn(
                'gap-2 rounded-lg px-5 py-2.5 text-sm font-medium',
                // Active pill uses the dark-navy text token (matching the design's filled tab),
                // not the brand primary; label flips to the background colour for contrast.
                isSelected
                  ? 'bg-text text-background hover:bg-text'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text',
                tabClassName,
                option.className,
              )}
            >
              {option.icon && <span className="inline-flex items-center">{option.icon}</span>}
              <span>{option.label}</span>
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('starterkit-tabs border-b border-border', className)}>
      {/* Inner wrapper provides the positioning context for the indicator.
          Keeping it one level deeper avoids the .starterkit-tabs > * { background: transparent !important }
          catch-all rule in globals.css from erasing bg-primary on the indicator. */}
      <div className="relative">
        <div
          ref={listRef}
          role="tablist"
          aria-label={label}
          className="flex overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const primitiveBadge =
              typeof option.badge === 'string' || typeof option.badge === 'number';

            return (
              <Button
                key={option.value}
                role="tab"
                variant="ghost"
                aria-selected={isSelected}
                onClick={() => onValueChanged(option.value)}
                data-testid={testIdPrefix ? `${testIdPrefix}-${option.value}` : undefined}
                className={cn(
                  'flex-1 gap-2 whitespace-nowrap rounded-none px-4 py-2.5 hover:bg-transparent focus-visible:ring-offset-0',
                  isSelected ? 'text-primary' : 'text-text-muted hover:text-text',
                  tabClassName,
                  option.className,
                )}
              >
                {option.icon && <span className="inline-flex items-center">{option.icon}</span>}
                <span>{option.label}</span>
                {primitiveBadge && (
                  <StatusBadge
                    label={String(option.badge)}
                    variant={isSelected ? 'primary' : 'neutral'}
                    className="rounded-full"
                  />
                )}
                {!primitiveBadge && isValidElement(option.badge) && (
                  <span className="inline-flex items-center">{option.badge}</span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Sliding underline indicator */}
        <div
          aria-hidden="true"
          className={cn(
            'absolute bottom-0 h-0.5 bg-primary [left:var(--tab-left)] [width:var(--tab-width)]',
            animated && 'transition-[left,width] duration-[220ms] ease-[ease]',
          )}
          style={
            {
              '--tab-left': `${indicator.left}px`,
              '--tab-width': `${indicator.width}px`,
            } as CSSProperties
          }
        />
      </div>
    </div>
  );
}
