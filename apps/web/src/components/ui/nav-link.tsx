'use client';

import type { NavItem } from '@lib/nav-items';
import { cn, iconSize } from '@starterkit/shared';
import Link from 'next/link';

// ─── Props ───────────────────────────────────────────────────────────────────

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
  /**
   * Club brand color for the active item's left accent bar. When null the bar
   * falls back to white so the active state still reads on the dark sidebar.
   */
  accentColor?: string | null;
  /** Icon-only rail mode — hides the label and centres the icon. */
  collapsed?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NavLink({
  item,
  isActive,
  onNavigate,
  accentColor = null,
  collapsed = false,
}: NavLinkProps) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      // When collapsed the label is hidden, so the link's accessible name and
      // hover tooltip both come from the title attribute.
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        // Fixed height keeps rows identical whether the label shows or not, so the
        // nav doesn't shift vertically when the sidebar collapses. shrink-0 stops the
        // flex column from squashing rows below h-9 on short viewports — the scroll
        // container handles the overflow instead (ABC-123).
        'relative flex h-9 shrink-0 items-center rounded-lg text-xs font-medium transition-colors',
        collapsed ? 'justify-center px-2' : 'gap-sm px-md',
        isActive
          ? 'bg-[var(--color-sidebar-nav-active)] text-white'
          : 'text-white/70 hover:bg-[var(--color-sidebar-nav-hover)] hover:text-white',
      )}
    >
      {/* Active accent bar — inset rounded pill in the club brand color.
          Inline style required: accentColor is a runtime hex value and cannot
          be expressed as a static Tailwind class. Falls back to currentColor,
          which inherits the active link's white text token. Hidden in the rail,
          where there is no room beside the centred icon. */}
      {isActive && !collapsed && (
        <span
          aria-hidden="true"
          className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: accentColor ?? 'currentColor' }}
        />
      )}
      {item.icon && (
        <item.icon
          size={iconSize.xs}
          aria-hidden="true"
          className={cn('shrink-0', isActive ? 'text-white' : 'text-white/50')}
          aria-label={undefined}
        />
      )}
      {/* Truncate rather than wrap so long labels stay on a single line. */}
      {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
    </Link>
  );
}
