'use client';

import type { User } from '@features/users/domain/entities/user';
import { useTranslation } from '@lib/i18n';
import { DeleteIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import Image from 'next/image';
import { Button, Typography } from '@/components/ui';

interface UserAvatarRowProps {
  user: User;
  isPending: boolean;
  onRemove: () => void;
}

export function UserAvatarRow({ user, isPending, onRemove }: UserAvatarRowProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full">
        <Image
          src={user.avatarUrl ?? ''}
          alt={user.displayName}
          width={48}
          height={48}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <Typography variant="body-sm" className="font-medium">
          {user.displayName}
        </Typography>
        <Button
          variant="ghost"
          type="button"
          onClick={onRemove}
          disabled={isPending}
          className="text-destructive hover:text-destructive/80 w-fit gap-1 text-sm hover:bg-transparent hover:underline disabled:opacity-50"
        >
          <DeleteIcon size={iconSize.xs} aria-hidden="true" />
          {t('users:actions.removeAvatar')}
        </Button>
      </div>
    </div>
  );
}
