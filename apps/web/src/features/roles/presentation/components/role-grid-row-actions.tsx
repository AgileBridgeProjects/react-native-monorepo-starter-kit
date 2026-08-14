import type { Role } from '@features/roles/domain/entities/role';
import { useTranslation } from '@lib/i18n';
import { BlockIcon, CheckIcon, EditIcon, KeyIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { ActionMenu } from '@/components/ui';

interface RoleGridRowActionsProps {
  role: Role;
  canManage: boolean;
  onEdit: (role: Role) => void;
  onManagePermissions: (role: Role) => void;
  onDeactivate: (role: Role) => void;
  onActivate: (role: Role) => void;
}

export function RoleGridRowActions({
  role,
  canManage,
  onEdit,
  onManagePermissions,
  onDeactivate,
  onActivate,
}: RoleGridRowActionsProps) {
  const { t } = useTranslation();

  return (
    <ActionMenu
      aria-label={t('roles:actions.rowMenu', { name: role.name })}
      items={[
        ...(canManage && !role.isSystem
          ? [
              {
                label: t('roles:actions.edit'),
                icon: <EditIcon size={iconSize.sm} />,
                onClick: () => onEdit(role),
              },
            ]
          : []),
        {
          label: t('roles:actions.permissions'),
          icon: <KeyIcon size={iconSize.sm} />,
          onClick: () => onManagePermissions(role),
        },
        ...(canManage && !role.isSystem && role.isActive
          ? [
              {
                label: t('roles:actions.deactivate'),
                icon: <BlockIcon size={iconSize.sm} />,
                variant: 'destructive' as const,
                onClick: () => onDeactivate(role),
              },
            ]
          : []),
        ...(canManage && !role.isSystem && !role.isActive
          ? [
              {
                label: t('roles:actions.activate'),
                icon: <CheckIcon size={iconSize.sm} />,
                onClick: () => onActivate(role),
              },
            ]
          : []),
      ]}
    />
  );
}
