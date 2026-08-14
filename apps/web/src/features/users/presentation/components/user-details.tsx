'use client';

import type { User } from '@features/users/domain/entities/user';
import { formatAuthMethod, formatRoleLabel } from '@features/users/presentation/utils/user-display';
import { formatAdminDate, useTranslation } from '@lib/i18n';
import {
  CalendarIcon,
  ClubsIcon,
  EmailIcon,
  LockIcon,
  PhoneIcon,
  SecurityIcon,
  SuccessIcon,
} from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import type { ReactNode } from 'react';
import { StatusBadge, Typography } from '@/components/ui';

function DetailRow({ label, icon, value }: { label: string; icon: ReactNode; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex shrink-0 items-center gap-2 text-text-secondary">
        {icon}
        <Typography variant="body-sm">{label}</Typography>
      </div>
      <Typography variant="body-sm" className="truncate text-right font-medium text-text">
        {value}
      </Typography>
    </div>
  );
}

interface UserDetailsProps {
  user: User;
  deptNameMap: Map<string, string>;
}

export function UserDetails({ user, deptNameMap }: UserDetailsProps) {
  const { t } = useTranslation();

  return (
    <div className="divide-y divide-border">
      <div className="space-y-3 pb-md">
        <Typography
          variant="body-sm"
          className="font-semibold uppercase tracking-wide text-text-muted"
        >
          {t('users:details.section.loginCredentials')}
        </Typography>
        <DetailRow
          label={t('users:details.field.email')}
          icon={<EmailIcon size={iconSize.sm} />}
          value={user.email ?? '-'}
        />
        <DetailRow
          label={t('users:details.field.phone')}
          icon={<PhoneIcon size={iconSize.sm} />}
          value={user.phoneNumber ?? '-'}
        />
        <DetailRow
          label={t('users:details.field.username')}
          icon={<LockIcon size={iconSize.sm} />}
          value={user.username ?? '-'}
        />
        <DetailRow
          label={t('users:details.field.authMethod')}
          icon={<SecurityIcon size={iconSize.sm} />}
          value={formatAuthMethod(user.authMethod, t)}
        />
      </div>

      <div className="space-y-3 py-md">
        <Typography
          variant="body-sm"
          className="font-semibold uppercase tracking-wide text-text-muted"
        >
          {t('users:details.section.organisationAndRole')}
        </Typography>
        <DetailRow
          label={t('users:details.field.role')}
          icon={<SecurityIcon size={iconSize.sm} />}
          value={formatRoleLabel(user.roles[0])}
        />
        <DetailRow
          label={t('users:details.field.team')}
          icon={<ClubsIcon size={iconSize.sm} />}
          value={user.teamIds[0] ? (deptNameMap.get(user.teamIds[0]) ?? user.teamIds[0]) : '-'}
        />
      </div>

      <div className="space-y-3 py-md">
        <Typography
          variant="body-sm"
          className="font-semibold uppercase tracking-wide text-text-muted"
        >
          {t('users:details.section.accountDetails')}
        </Typography>
        <div className="flex items-center justify-between">
          <Typography variant="body-sm" className="text-text-secondary">
            {t('users:details.field.status')}
          </Typography>
          <StatusBadge
            label={user.isActive ? t('users:status.active') : t('users:status.inactive')}
            variant={user.isActive ? 'success' : 'error'}
          />
        </div>
      </div>

      <div className="space-y-3 pt-md">
        <Typography
          variant="body-sm"
          className="font-semibold uppercase tracking-wide text-text-muted"
        >
          {t('users:details.section.timeline')}
        </Typography>
        <DetailRow
          label={t('users:details.field.created')}
          icon={<CalendarIcon size={iconSize.sm} />}
          value={formatAdminDate(user.createdAt)}
        />
        <DetailRow
          label={t('users:details.field.lastLogin')}
          icon={<SuccessIcon size={iconSize.sm} />}
          value={user.lastLoginAt ? formatAdminDate(user.lastLoginAt) : '-'}
        />
      </div>
    </div>
  );
}
