'use client';

import type { User } from '@features/users/domain/entities/user';
import { useTranslation } from '@lib/i18n';
import { DeleteIcon, UsersIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { Button, ModalShell } from '@/components/ui';
import { useConfirmedRemoveAvatar } from '../hooks/use-confirmed-remove-avatar';

interface UserAvatarPreviewModalProps {
  user: User | null;
  canManage: boolean;
  onHide: () => void;
  onAvatarDeleted?: () => void;
}

export function UserAvatarPreviewModal({
  user,
  canManage,
  onHide,
  onAvatarDeleted,
}: UserAvatarPreviewModalProps) {
  const { t } = useTranslation();
  const { removeAvatarWithConfirm, isRemovingAvatar, confirmDialog } = useConfirmedRemoveAvatar({
    onSuccess: () => {
      onHide();
      onAvatarDeleted?.();
    },
  });

  return (
    <>
      <ModalShell
        visible={!!user}
        onHide={onHide}
        width={360}
        hideOnOutsideClick
        icon={<UsersIcon size={iconSize.sm} className="text-primary" />}
        title={user?.displayName ?? ''}
      >
        <div className="flex flex-col items-center gap-lg">
          {/* biome-ignore lint/performance/noImgElement: avatar is a SAS URL, Next Image requires domain config */}
          <img
            src={user?.avatarUrl ?? undefined}
            alt={user?.displayName ?? ''}
            className="h-52 w-52 rounded-full object-cover shadow-md"
          />
          <div className="flex w-full items-center justify-end gap-sm border-t border-border pt-lg">
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                isLoading={isRemovingAvatar}
                icon={<DeleteIcon size={iconSize.xs} aria-hidden />}
                onClick={() => user && void removeAvatarWithConfirm(user.id, user.displayName)}
                className="mr-auto text-destructive hover:bg-transparent hover:text-destructive/80 hover:underline disabled:opacity-50"
              >
                {t('users:actions.removeAvatar')}
              </Button>
            )}
            <Button variant="outlined" onClick={onHide}>
              {t('common:actions.close')}
            </Button>
          </div>
        </div>
      </ModalShell>
      {confirmDialog}
    </>
  );
}
