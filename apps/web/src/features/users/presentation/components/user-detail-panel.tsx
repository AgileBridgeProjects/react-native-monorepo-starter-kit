'use client';

import type { User } from '@features/users/domain/entities/user';
import { useTranslation } from '@lib/i18n';
import { Button, DrawerPanel } from '@/components/ui';
import { UserDetails } from './user-details';

interface UserDetailPanelProps {
  user: User | null;
  onHide: () => void;
  deptNameMap: Map<string, string>;
  onEdit?: (user: User) => void;
  canManage?: boolean;
}

export function UserDetailPanel({
  user,
  onHide,
  deptNameMap,
  onEdit,
  canManage,
}: UserDetailPanelProps) {
  const { t } = useTranslation();

  return (
    <DrawerPanel
      title="User details"
      visible={!!user}
      onHide={onHide}
      bottomContent={
        canManage && onEdit && user ? (
          <Button onClick={() => onEdit(user)}>{t('users:actions.edit')}</Button>
        ) : undefined
      }
    >
      {user && <UserDetails user={user} deptNameMap={deptNameMap} />}
    </DrawerPanel>
  );
}
