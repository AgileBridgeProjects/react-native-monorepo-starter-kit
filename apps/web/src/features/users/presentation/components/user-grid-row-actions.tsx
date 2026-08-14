import type { User } from '@features/users/domain/entities/user';
import { useTranslation } from '@lib/i18n';
import { BlockIcon, EditIcon, EmailIcon, KeyIcon, ViewIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { ActionMenu, Spinner } from '@/components/ui';
import { AuthenticationMethod, SetupStatus } from '@/proxy/models';

interface UserGridRowActionsProps {
  user: User;
  canManage: boolean;
  resendingUserId: string | null;
  disablingUserId: string | null;
  isCurrentUser: boolean;
  onEditUser: (user: User) => void;
  onViewDetails: (user: User) => void;
  onResendSetupLink: (user: User) => void;
  onDisableUser: (user: User) => void;
  onChangePassword: (user: User) => void;
}

export function UserGridRowActions({
  user,
  canManage,
  resendingUserId,
  disablingUserId,
  isCurrentUser,
  onEditUser,
  onViewDetails,
  onResendSetupLink,
  onDisableUser,
  onChangePassword,
}: UserGridRowActionsProps) {
  const { t } = useTranslation();

  if (resendingUserId === user.id || disablingUserId === user.id) {
    return <Spinner className="h-5 w-5" />;
  }

  const canCopySetupLink =
    user.authMethod === AuthenticationMethod.Credentials &&
    !user.lastLoginAt &&
    (user.setupStatus === SetupStatus.PendingSetup ||
      user.setupStatus === SetupStatus.SetupExpired);

  return (
    <ActionMenu
      aria-label={t('users:actions.rowMenu', { name: user.displayName })}
      items={[
        {
          label: t('users:actions.detailedView'),
          icon: <ViewIcon size={iconSize.sm} />,
          onClick: () => onViewDetails(user),
        },
        ...(canManage
          ? [
              {
                label: t('users:actions.edit'),
                icon: <EditIcon size={iconSize.sm} />,
                onClick: () => onEditUser(user),
              },
            ]
          : []),
        ...(canManage && canCopySetupLink
          ? [
              {
                label: t('users:actions.resendSetupLink'),
                icon: <EmailIcon size={iconSize.sm} />,
                onClick: () => onResendSetupLink(user),
              },
            ]
          : []),
        ...(canManage && !isCurrentUser && user.isActive
          ? [
              {
                label: t('users:actions.disable'),
                icon: <BlockIcon size={iconSize.sm} />,
                variant: 'destructive' as const,
                onClick: () => onDisableUser(user),
              },
            ]
          : []),
        ...(canManage &&
        (user.authMethod === AuthenticationMethod.CustomAuthentication ||
          user.authMethod === AuthenticationMethod.Credentials)
          ? [
              {
                label: t('users:actions.changePassword'),
                icon: <KeyIcon size={iconSize.sm} />,
                onClick: () => onChangePassword(user),
              },
            ]
          : []),
      ]}
    />
  );
}
