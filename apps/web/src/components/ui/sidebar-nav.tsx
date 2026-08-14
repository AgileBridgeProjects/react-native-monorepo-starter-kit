'use client';

import { useTranslation } from '@lib/i18n';
import { useNavGroups } from '@lib/nav-items';
import { cn } from '@starterkit/shared';
import { usePathname } from 'next/navigation';
import { NavGroup } from '@/components/ui/nav-group';
import { NavLink } from '@/components/ui/nav-link';
import { Typography } from '@/components/ui/typography';

// ─── Props ───────────────────────────────────────────────────────────────────

interface SidebarNavProps {
  /** Called after the user taps a nav link — used by the mobile drawer to close itself. */
  onNavigate?: () => void;
  /** Icon-only rail mode. */
  collapsed?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SidebarNav({ onNavigate, collapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { clubScoped, admin } = useNavGroups();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label={t('common:portal.mainNavigation')}
      className="flex flex-1 flex-col overflow-hidden"
    >
      {/* ── Club-scoped section — the only scrolling region ── */}
      <div className="sidebar-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto px-md py-md">
        {clubScoped.map((item) =>
          item.children && item.children.length > 0 ? (
            <NavGroup key={item.href} item={item} onNavigate={onNavigate} collapsed={collapsed} />
          ) : (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          ),
        )}
      </div>

      {/* ── Admin section — pinned to the bottom outside the scroll area so its
          position depends only on the footer, never on the content above. This is
          what keeps it from jumping when a hover-peek changes the content height. ── */}
      {admin.length > 0 && (
        <div className="shrink-0 px-md pb-md">
          <div className="-mx-md border-t border-white/10" />
          <div className="flex flex-col gap-0.5 pt-sm">
            {/* Caption slot — always mounted at a fixed height; the label only fades
                out when collapsed (rather than unmounting), so the group keeps a
                constant height and the text doesn't pop. Clipped in the rail. */}
            <div className="flex h-7 items-end overflow-hidden pb-1">
              <Typography
                variant="caption"
                as="span"
                className={cn(
                  'whitespace-nowrap font-semibold uppercase tracking-widest text-white/40 transition-opacity duration-200',
                  collapsed && 'opacity-0',
                )}
              >
                {t('common:portal.admin')}
              </Typography>
            </div>
            {admin.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                onNavigate={onNavigate}
                collapsed={collapsed}
              />
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
