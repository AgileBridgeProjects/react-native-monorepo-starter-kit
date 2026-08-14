'use client';

import type { NavItem } from '@lib/nav-items';
import { ExpandLessIcon, ExpandMoreIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/ui/nav-link';

// ─── Props ───────────────────────────────────────────────────────────────────

interface NavGroupProps {
  /** Parent item; must have `children`. */
  item: NavItem;
  onNavigate?: () => void;
  /** Club brand color for the active item's left accent bar. */
  accentColor?: string | null;
  /** Icon-only rail mode — collapses to a single link, children are hidden. */
  collapsed?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * An expandable sidebar parent with nested children (e.g. Reports → Summary/Players/…).
 * The group auto-expands whenever the user is on one of its routes; the chevron toggles it
 * otherwise. In the collapsed rail there is no room for children, so it renders as a plain
 * icon link to the parent route.
 */
export function NavGroup({
  item,
  onNavigate,
  accentColor = null,
  collapsed = false,
}: NavGroupProps) {
  const pathname = usePathname();
  const children = item.children ?? [];

  const within = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const isChildActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Default to open whenever the user is on one of this group's routes; the chevron sets a manual
  // override that sticks until toggled again. Derived on render — no state-sync effect needed.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? within;

  // In the rail there is no room for children — fall back to a single icon link.
  if (collapsed) {
    return (
      <NavLink
        item={item}
        isActive={within}
        onNavigate={onNavigate}
        accentColor={accentColor}
        collapsed
      />
    );
  }

  const Icon = item.icon;
  // Highlight the parent only when it's the active route itself, not when a child is active.
  const parentActive = within && !children.some((c) => isChildActive(c.href));

  return (
    <div className="flex shrink-0 flex-col gap-0.5">
      <div className="flex items-center">
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={parentActive ? 'page' : undefined}
          className={cn(
            'relative flex h-9 flex-1 items-center gap-sm rounded-lg px-md text-xs font-medium transition-colors',
            parentActive
              ? 'bg-[var(--color-sidebar-nav-active)] text-white'
              : 'text-white/70 hover:bg-[var(--color-sidebar-nav-hover)] hover:text-white',
          )}
        >
          {parentActive && (
            <span
              aria-hidden="true"
              className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: accentColor ?? 'currentColor' }}
            />
          )}
          {Icon && (
            <Icon
              size={iconSize.xs}
              aria-hidden="true"
              className={cn('shrink-0', parentActive ? 'text-white' : 'text-white/50')}
            />
          )}
          <span className="min-w-0 truncate">{item.label}</span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setManualOpen(!open)}
          aria-expanded={open}
          aria-label={item.label}
          className="ml-0.5 h-9 text-white/50 hover:bg-[var(--color-sidebar-nav-hover)] hover:text-white"
        >
          {open ? (
            <ExpandLessIcon size={iconSize.xs} aria-hidden="true" />
          ) : (
            <ExpandMoreIcon size={iconSize.xs} aria-hidden="true" />
          )}
        </Button>
      </div>

      {open && (
        <div className="flex flex-col gap-0.5">
          {children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
              data-testid={child.testId}
              aria-current={isChildActive(child.href) ? 'page' : undefined}
              className={cn(
                'relative flex h-9 shrink-0 items-center rounded-lg pr-md pl-[2.75rem] text-xs transition-colors',
                isChildActive(child.href)
                  ? 'bg-[var(--color-sidebar-nav-active)] font-medium text-white'
                  : 'text-white/60 hover:bg-[var(--color-sidebar-nav-hover)] hover:text-white',
              )}
            >
              {isChildActive(child.href) && (
                <span
                  aria-hidden="true"
                  className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: accentColor ?? 'currentColor' }}
                />
              )}
              <span className="min-w-0 truncate">{child.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
