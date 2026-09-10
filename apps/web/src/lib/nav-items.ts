'use client';

import { useCurrentSession } from '@features/auth/presentation/hooks/use-current-session';
import { useTranslation } from '@lib/i18n';
import type { IconProps } from '@starterkit/icons';
import {
  ClubsIcon,
  DocumentIcon,
  HistoryIcon,
  SecurityIcon,
  ShareWithTeamsIcon,
  UsersIcon,
  WarningIcon,
} from '@starterkit/icons';
import type { ComponentType } from 'react';

export interface NavItem {
  label: string;
  href: string;
  /** Top-level items carry an icon; nested children render as indented text and omit it. */
  icon?: ComponentType<IconProps>;
  /** Permission key required to see this item. Undefined = visible to all authenticated users. */
  permission?: string;
  /** Optional stable test id applied to the rendered link (used by e2e selectors). */
  testId?: string;
  /**
   * Optional nested items rendered as an expandable group beneath this one (e.g. Reports →
   * Summary/Teams). Children inherit the parent's visibility; gate individually with
   * their own `permission` if needed.
   */
  children?: NavItem[];
}

export interface NavGroups {
  /** Items that are scoped to the selected workspace (Users, Reports). */
  clubScoped: NavItem[];
  /** Global admin items (Clubs, Roles, Audit Logs). */
  admin: NavItem[];
}

/** Raw nav definitions without permission filtering — internal to this module. */
interface RawNavGroups {
  allClubScoped: NavItem[];
  allAdmin: NavItem[];
}

function useNavDefinitions(): RawNavGroups {
  const { t } = useTranslation();
  return {
    allClubScoped: [
      {
        label: t('nav:teams'),
        href: '/teams',
        icon: ShareWithTeamsIcon,
        permission: 'StarterKit.Teams.View',
      },
      {
        label: t('nav:users'),
        href: '/users',
        icon: UsersIcon,
        permission: 'StarterKit.Users.View',
      },
    ],
    allAdmin: [
      {
        label: t('nav:clubs'),
        href: '/clubs',
        icon: ClubsIcon,
        permission: 'StarterKit.Clubs.View',
      },
      {
        label: t('nav:roles'),
        href: '/roles',
        icon: SecurityIcon,
        permission: 'StarterKit.Roles.View',
      },
      {
        label: t('nav:audit-logs'),
        href: '/audit-logs',
        icon: HistoryIcon,
        permission: 'StarterKit.Auditing.View',
      },
    ],
  };
}

/**
 * Top-level navigation items for the admin portal sidebar, split into two groups.
 * Each group is pre-filtered to only items the current user has permission to see.
 */
export function useNavGroups(): NavGroups {
  const { hasPermission } = useCurrentSession();
  const { allClubScoped, allAdmin } = useNavDefinitions();

  return {
    clubScoped: allClubScoped.filter((item) => !item.permission || hasPermission(item.permission)),
    admin: allAdmin.filter((item) => !item.permission || hasPermission(item.permission)),
  };
}
