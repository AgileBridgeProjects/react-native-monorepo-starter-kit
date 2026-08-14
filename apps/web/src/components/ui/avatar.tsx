'use client';

import { OpenInFullIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from './button';

interface AvatarProps {
  name: string;
  avatarUrl: string | null;
  onExpand?: () => void;
}

export function Avatar({ name, avatarUrl, onExpand }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  if (avatarUrl && !failed) {
    return (
      <div className="group relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
        <Image
          src={avatarUrl}
          alt={name}
          width={32}
          height={32}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
        {onExpand && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onExpand}
            className="absolute inset-0 rounded-full p-0 hover:bg-transparent group-hover:bg-black/40"
            aria-label={`View ${name}'s profile picture`}
          >
            <OpenInFullIcon
              size={iconSize.xs}
              className="text-white opacity-0 transition-opacity group-hover:opacity-100"
            />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      {name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('')}
    </div>
  );
}
