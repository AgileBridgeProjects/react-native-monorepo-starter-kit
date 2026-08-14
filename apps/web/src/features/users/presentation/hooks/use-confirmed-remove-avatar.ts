'use client';

import { useConfirm } from '@lib/hooks/use-confirm';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { notify } from '@/components/ui';
import { useRemoveAvatar } from './use-remove-avatar';

interface UseConfirmedRemoveAvatarOptions {
  onSuccess?: () => void;
}

export function useConfirmedRemoveAvatar({ onSuccess }: UseConfirmedRemoveAvatarOptions = {}) {
  const { t } = useTranslation();
  const { confirm, confirmDialog } = useConfirm();
  const { mutate: removeAvatar, isPending: isRemovingAvatar } = useRemoveAvatar();

  async function removeAvatarWithConfirm(userId: string, displayName: string): Promise<void> {
    const confirmed = await confirm({
      title: t('users:confirm.removeAvatar.title'),
      message: t('users:confirm.removeAvatar.message', { name: displayName }),
      confirmLabel: t('users:confirm.removeAvatar.confirm'),
      destructive: true,
    });
    if (!confirmed) return;
    removeAvatar(userId, {
      onSuccess: () => {
        notify(t('users:toast.removeAvatarSuccess'), 'success', uiConfig.toast.durationMs);
        onSuccess?.();
      },
      onError: () => {
        notify(t('users:toast.removeAvatarFailed'), 'error', uiConfig.toast.errorDurationMs);
      },
    });
  }

  return { removeAvatarWithConfirm, isRemovingAvatar, confirmDialog };
}
