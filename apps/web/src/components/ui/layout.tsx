'use client';

import { useLogout } from '@features/auth/presentation/hooks/use-auth';
import { WorkspaceSwitcher } from '@features/workspace/presentation/components/workspace-switcher';
import { useTranslation } from '@lib/i18n';
import { ChevronLeftIcon, ChevronRightIcon, LogoutIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import DxButton from 'devextreme-react/button';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import { useUiStore } from '@/store/ui-store';
import { SidebarNav } from './sidebar-nav';

/**
 * Static sidebar surface. White-labelling (skinning the sidebar with the club's
 * brand colour) is off, so no dynamic styles are needed.
 */
const sidebarStyle: React.CSSProperties = { backgroundColor: 'var(--color-sidebar-dark)' };

// ─── Props ───────────────────────────────────────────────────────────────────

export interface LayoutProps {
  children: React.ReactNode;
}

// ─── Sidebar footer with logout ──────────────────────────────────────────────

interface SidebarFooterProps {
  collapsed?: boolean;
}

function SidebarFooter({ collapsed = false }: SidebarFooterProps) {
  const { t } = useTranslation();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  return (
    <div
      className={cn(
        'shrink-0 border-t border-white/10 py-sm',
        collapsed ? 'flex flex-col items-center gap-xs px-2' : 'flex items-center gap-sm px-md',
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        isLoading={isLoggingOut}
        aria-label={t('common:portal.logOut')}
        title={collapsed ? t('common:portal.logOut') : undefined}
        onClick={() => logout()}
        className={cn(
          'gap-sm text-on-primary-muted hover:bg-on-primary-surface-hover hover:text-on-primary',
          collapsed ? 'justify-center px-0' : 'flex-1 justify-start',
        )}
      >
        <LogoutIcon size={iconSize.sm} aria-hidden="true" />
        {!collapsed && t('common:portal.logOut')}
      </Button>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { i18n, t } = useTranslation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const isRtl = i18n.dir() === 'rtl';

  // Points away from the content area to communicate the expand/collapse direction.
  const CollapseChevron =
    (collapsed && !isRtl) || (!collapsed && isRtl) ? ChevronRightIcon : ChevronLeftIcon;

  // Transient hover "peek" — while collapsed, hovering expands the sidebar as an
  // overlay (floating over the content) without touching the persisted preference.
  const [peeking, setPeeking] = useState(false);
  const effectiveCollapsed = collapsed && !peeking;
  const isPeeking = collapsed && peeking;

  const [sidebarHovered, setSidebarHovered] = useState(false);

  // Debounce the peek-close so a momentary pointer exit (e.g. crossing the floating
  // edge toggle, which sits half outside the rail) doesn't unmount and instantly
  // remount the expanded content — that churn is what made collapse feel jumpy.
  const peekCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openPeek = useCallback(() => {
    if (peekCloseTimer.current) {
      clearTimeout(peekCloseTimer.current);
      peekCloseTimer.current = null;
    }
    setSidebarHovered(true);
    setPeeking(true);
  }, []);

  const closePeek = useCallback(() => {
    if (peekCloseTimer.current) clearTimeout(peekCloseTimer.current);
    peekCloseTimer.current = setTimeout(() => {
      setSidebarHovered(false);
      setPeeking(false);
      peekCloseTimer.current = null;
    }, 150);
  }, []);

  useEffect(
    () => () => {
      if (peekCloseTimer.current) clearTimeout(peekCloseTimer.current);
    },
    [],
  );

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Close drawer on Escape key
  useEscapeKey(closeSidebar, sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop sidebar (collapsible to an icon rail; hover peeks it open) ──
          The slot keeps the rail's width; the aside is positioned within it so a
          hover-peek floats out over the content instead of pushing the page. */}
      <div
        className={cn(
          'relative hidden shrink-0 transition-[width] duration-200 md:block',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <aside
          aria-label={t('common:portal.sidebar')}
          onMouseEnter={openPeek}
          onMouseLeave={closePeek}
          className={cn(
            // Base z-30 keeps the aside above the main content at all times. Without
            // it, pinning the sidebar open from a hover-peek briefly drops the aside
            // behind the content while the reserved slot animates to full width, so
            // the content flashes over the sidebar. Peek adds z-40 + shadow on top.
            'absolute inset-y-0 z-30 flex flex-col transition-[width] duration-200',
            isRtl ? 'right-0' : 'left-0',
            effectiveCollapsed ? 'w-16' : 'w-60',
            isPeeking && 'z-40 shadow-2xl',
          )}
          style={sidebarStyle}
        >
          <WorkspaceSwitcher collapsed={effectiveCollapsed} />
          <SidebarNav collapsed={effectiveCollapsed} />
          <SidebarFooter collapsed={effectiveCollapsed} />

          {/* Harvest-style edge toggle — always visible when collapsed, appears on hover when expanded */}
          {(sidebarHovered || collapsed) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={
                collapsed ? t('common:portal.expandSidebar') : t('common:portal.collapseSidebar')
              }
              aria-expanded={!collapsed}
              className={cn(
                'absolute top-1/2 z-50 h-6 w-6 -translate-y-1/2 rounded-full border border-border bg-surface p-0 text-text-muted shadow-md hover:bg-surface hover:text-text',
                isRtl ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2',
              )}
            >
              <CollapseChevron size={iconSize.sm} aria-hidden="true" aria-label={undefined} />
            </Button>
          )}
        </aside>
      </div>

      {/* ── Mobile sidebar overlay (backdrop) ── */}
      {sidebarOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* ── Mobile sidebar drawer ── */}
      <aside
        id="mobile-sidebar"
        aria-label={t('common:portal.mobileNavigation')}
        aria-hidden={!sidebarOpen}
        className={cn(
          'fixed inset-y-0 z-50 flex w-60 flex-col transition-transform duration-200 md:hidden',
          i18n.dir() === 'rtl' ? 'right-0' : 'left-0',
          sidebarOpen
            ? 'translate-x-0'
            : i18n.dir() === 'rtl'
              ? 'translate-x-full'
              : '-translate-x-full',
        )}
        style={sidebarStyle}
      >
        <div className="flex h-14 shrink-0 items-center justify-end border-b border-white/10 px-md">
          <DxButton
            stylingMode="text"
            icon="close"
            hint={t('common:portal.closeNavigation')}
            elementAttr={{ 'aria-label': t('common:portal.closeNavigation') }}
            onClick={closeSidebar}
          />
        </div>
        <WorkspaceSwitcher />
        <SidebarNav onNavigate={closeSidebar} />
        <SidebarFooter />
      </aside>

      {/* ── Main content (no header bar) ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile-only hamburger */}
        <div className="flex h-14 shrink-0 items-center border-b border-border px-md md:hidden">
          <DxButton
            stylingMode="text"
            icon="menu"
            hint={t('common:portal.openNavigation')}
            elementAttr={{
              'aria-label': t('common:portal.openNavigation'),
              'aria-expanded': String(sidebarOpen),
              'aria-controls': 'mobile-sidebar',
            }}
            onClick={() => setSidebarOpen(true)}
          />
        </div>

        <main className="flex flex-1 flex-col overflow-y-auto p-md md:p-lg">{children}</main>
      </div>
    </div>
  );
}
